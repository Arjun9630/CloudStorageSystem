import time
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import urllib.parse

VIOLATION_LIMIT = 5
BAN_DURATION = 600 # 10 minutes

class IPViolationState:
    def __init__(self):
        self.violations = defaultdict(int)
        self.banned_ips = {}

ip_violation_state = IPViolationState()

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https:;"
        )
        return response

class SuspiciousQueryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # We unquote to catch things like %3Cscript%3E
        path = urllib.parse.unquote(request.url.path).lower()
        query = urllib.parse.unquote(request.url.query).lower()
        
        forbidden_keywords = ["select", "union", "<script>", "../", "base64"]
        
        for kw in forbidden_keywords:
            # We add basic spacing/bounding around select/union to avoid false positives 
            # if a file is just named "selection.pdf", or we just match the exact keyword.
            # The specs ask: detect and block suspicious query patterns... keywords like "select", "union"...
            # Using simple 'in' check as defined:
            if kw in path or kw in query:
                # To be safer about file names, we only block exact standalone words for select/union
                # But for <script> and ../ we block anywhere.
                if kw in ("select", "union"):
                    # Check if surrounded by non-alphanumeric (e.g. " select " or "?q=select")
                    import re
                    if re.search(rf'\b{kw}\b', path) or re.search(rf'\b{kw}\b', query):
                        return Response(content="Forbidden: Suspicious query detected", status_code=403)
                else:
                    return Response(content="Forbidden: Suspicious query detected", status_code=403)
                    
        return await call_next(request)

class IPBanMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        # Check if currently banned
        if client_ip in ip_violation_state.banned_ips:
            if current_time < ip_violation_state.banned_ips[client_ip]:
                return Response(
                    content='{"detail": "IP is temporarily banned due to policy violations."}',
                    media_type="application/json",
                    status_code=403
                )
            else:
                # Ban expired, lift the ban
                del ip_violation_state.banned_ips[client_ip]
                ip_violation_state.violations[client_ip] = 0
                
        # Proceed with request
        response = await call_next(request)
        
        # Check response status for violations
        if response.status_code in [401, 403, 429]:
            ip_violation_state.violations[client_ip] += 1
            if ip_violation_state.violations[client_ip] >= VIOLATION_LIMIT:
                ip_violation_state.banned_ips[client_ip] = current_time + BAN_DURATION
                
        return response
