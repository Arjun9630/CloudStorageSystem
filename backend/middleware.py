import ipaddress
import logging
import os
import re
import time
import urllib.parse
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

VIOLATION_LIMIT = 5
BAN_DURATION = 600  # 10 minutes


def _parse_bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _is_valid_ip(ip: str) -> bool:
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def _load_trusted_proxy_ips() -> set[str]:
    raw = os.getenv("TRUSTED_PROXY_IPS", "")
    trusted = set()
    for part in raw.split(","):
        ip = part.strip()
        if not ip:
            continue
        if _is_valid_ip(ip):
            trusted.add(ip)
        else:
            logger.warning("Ignoring invalid TRUSTED_PROXY_IPS entry: %s", ip)
    return trusted


TRUST_ALL_PROXIES = _parse_bool_env("TRUST_ALL_PROXIES", default=False)
TRUSTED_PROXY_IPS = _load_trusted_proxy_ips()


def _extract_forwarded_ip(x_forwarded_for: str | None) -> str | None:
    if not x_forwarded_for:
        return None
    # X-Forwarded-For can contain multiple values; left-most is original client.
    for candidate in [part.strip() for part in x_forwarded_for.split(",")]:
        if _is_valid_ip(candidate):
            return candidate
    return None


class IPViolationState:
    def __init__(self):
        self.violations = defaultdict(int)
        self.banned_ips = {}


ip_violation_state = IPViolationState()


def get_client_ip(request: Request):
    """
    Returns client IP with proxy safety.
    Uses X-Forwarded-For only when immediate client is trusted.
    """
    remote_ip = request.client.host if request.client else "unknown"
    if not _is_valid_ip(remote_ip):
        return "unknown"

    if TRUST_ALL_PROXIES or remote_ip in TRUSTED_PROXY_IPS:
        forwarded_ip = _extract_forwarded_ip(request.headers.get("X-Forwarded-For"))
        if forwarded_ip:
            return forwarded_ip
    return remote_ip


def _build_csp_sources() -> dict[str, str]:
    bucket = os.getenv("S3_BUCKET_NAME", "").strip()
    region = os.getenv("AWS_REGION", "us-east-1").strip()
    additional_media_origins = {
        origin.strip()
        for origin in os.getenv("CSP_MEDIA_ORIGINS", "").split(",")
        if origin.strip()
    }
    s3_origins = set()
    if bucket:
        s3_origins.add(f"https://{bucket}.s3.amazonaws.com")
        s3_origins.add(f"https://{bucket}.s3.{region}.amazonaws.com")

    allowed_media_origins = sorted(s3_origins | additional_media_origins)
    media_src = ["'self'", "blob:"] + allowed_media_origins
    img_src = ["'self'", "data:", "blob:"] + allowed_media_origins
    connect_src = ["'self'"] + allowed_media_origins

    return {
        "default-src": "'self'",
        "script-src": "'self'",
        # Needed because the app uses inline style attributes in React components.
        "style-src": "'self' 'unsafe-inline'",
        "img-src": " ".join(img_src),
        "font-src": "'self' data:",
        "media-src": " ".join(media_src),
        "connect-src": " ".join(connect_src),
        "object-src": "'none'",
        "base-uri": "'self'",
        "frame-ancestors": "'none'",
        "form-action": "'self'",
    }


def _serialize_csp(policy: dict[str, str]) -> str:
    return "; ".join([f"{key} {value}" for key, value in policy.items()]) + ";"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._csp_header = _serialize_csp(_build_csp_sources())

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        )
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = self._csp_header
        return response


class SuspiciousQueryMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # Pre-compile regex attack patterns to optimize middleware performance
        self.suspicious_patterns = [
            re.compile(r"(?i)<\s*script\b[^>]*>"),  # XSS script tags
            re.compile(r"(?i)\bunion\s+(?:all\s+)?select\b"),  # SQLi UNION base
            re.compile(r"(?i)\bselect\b.*\bfrom\b"),  # SQLi SELECT...FROM payload
            re.compile(r"(?i)\bor\s+1\s*=\s*1\b"),  # SQLi common OR bypass
            re.compile(r"\.\./"),  # Path Traversal
            re.compile(r"(?i)base64\s*,"),  # Encoded payloads
        ]

    async def dispatch(self, request: Request, call_next):
        # Target the entire unquoted path and query for analysis
        path = urllib.parse.unquote(request.url.path)
        query = urllib.parse.unquote(request.url.query)
        target_string = path + "?" + query

        for pattern in self.suspicious_patterns:
            if pattern.search(target_string):
                client_ip = get_client_ip(request)
                logger.warning(
                    "Suspicious request blocked. Pattern: %s | URL: %s | IP: %s",
                    pattern.pattern,
                    request.url,
                    client_ip,
                )
                return JSONResponse(
                    content={"detail": "Forbidden: Suspicious query detected"},
                    status_code=403,
                )

        return await call_next(request)


class IPBanMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = get_client_ip(request)
        current_time = time.time()

        # Block requests early if the IP is currently banned
        if client_ip in ip_violation_state.banned_ips:
            if current_time < ip_violation_state.banned_ips[client_ip]:
                logger.warning(
                    "Request attempted by banned IP: %s | URL: %s",
                    client_ip,
                    request.url,
                )
                return JSONResponse(
                    content={"detail": "IP is temporarily banned due to policy violations."},
                    status_code=403,
                )

            del ip_violation_state.banned_ips[client_ip]
            ip_violation_state.violations[client_ip] = 0

        response = await call_next(request)

        # Track only malicious behavior (403 forbidden patterns and 429 abuse/rate-limit)
        if response.status_code in [403, 429]:
            ip_violation_state.violations[client_ip] += 1

            if ip_violation_state.violations[client_ip] == VIOLATION_LIMIT:
                ip_violation_state.banned_ips[client_ip] = current_time + BAN_DURATION
                logger.warning(
                    "IP BANNED: %s has been banned for %s seconds after %s malicious violations.",
                    client_ip,
                    BAN_DURATION,
                    VIOLATION_LIMIT,
                )

        return response
