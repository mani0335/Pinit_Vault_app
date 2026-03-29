from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from ..db.database import get_admin_db
import os
import random
import string

load_dotenv()

JWT_SECRET          = os.getenv("JWT_SECRET")
JWT_EXPIRE_MINUTES  = int(os.getenv("JWT_EXPIRE_MINUTES", 60))
ALGORITHM           = "HS256"

security = HTTPBearer()


def generate_jwt(user_id: str, role: str, expires_in_minutes: int = None) -> str:
    """Create a JWT token for a user"""
    if expires_in_minutes is None:
        expires_in_minutes = JWT_EXPIRE_MINUTES
    expire  = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
    payload = {
        "sub"  : user_id,
        "role" : role,
        "exp"  : expire,
        "iat"  : datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def verify_jwt(token: str) -> dict:
    """Verify a JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail      = "Invalid or expired token"
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    FastAPI dependency — use in any route to get logged-in user
    Usage: current_user = Depends(get_current_user)
    """
    token   = credentials.credentials
    payload = verify_jwt(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    db     = get_admin_db()
    result = db.table("users").select("*").eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")

    user = result.data[0]

    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account suspended")

    return user


def get_admin_user(current_user=Depends(get_current_user)):
    """
    FastAPI dependency — only allows admin users
    Usage: admin = Depends(get_admin_user)
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code = status.HTTP_403_FORBIDDEN,
            detail      = "Admin access required"
        )
    return current_user


def generate_otp(length: int = 6) -> str:
    """Generate a 6-digit OTP code"""
    return ''.join(random.choices(string.digits, k=length))


def log_action(user_id: str, action: str, details: dict, ip: str = None):
    """Save an action to the audit log"""
    try:
        db = get_admin_db()
        db.table("audit_log").insert({
            "user_id"    : user_id,
            "action"     : action,
            "details"    : details,
            "ip_address" : ip
        }).execute()
    except Exception as e:
        print(f"Audit log error: {e}")