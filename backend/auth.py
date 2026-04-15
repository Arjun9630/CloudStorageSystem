import bcrypt
from jose import jwt
import os
import time
from datetime import datetime, timedelta
import logging
import re

logger = logging.getLogger(__name__)

# Use a secure random string or load from ENV
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is required")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days instance

def validate_password_strength(password: str) -> bool:
    """Check if password meets complexity requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special."""
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False
    return True

def sanitize_name(name: str) -> str:
    """Sanitize file or folder name to prevent path traversal and strip invalid characters."""
    if not name:
        return "unnamed"
    # Remove path components
    name = os.path.basename(name)
    # Remove control characters
    name = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', name)
    # Remove problematic characters
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    # Limit length
    if len(name) > 255:
        name = name[:250] + "_trim"
    name = name.strip(' .')
    if not name:
        return "unnamed"
    return name


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the provided plain text password matches the hashed password."""
    try:
        # Bcrypt expects bytes. Truncate to 72 bytes.
        password_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hash a plain text password."""
    # Bcrypt expects bytes. Truncate to 72 bytes.
    password_bytes = password.encode('utf-8')[:72]
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Create a new JWT token containing user data payload."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Use the 7-day constant instead of 15 minutes
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """Decode a JWT and extract user data if it's valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.JWTError:
        return None

def create_reset_token(email: str) -> str:
    """Create a short-lived token specifically for password resetting."""
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {"sub": email, "exp": expire, "purpose": "password_reset"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_reset_token(token: str) -> str:
    """Validate a reset token and return the internal email if valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload.get("sub")
    except jwt.JWTError:
        return None

