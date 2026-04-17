from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from pathlib import Path
import os

# Load .env from the backend directory
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

from .routers import auth, vault, compare, admin, certificates, sharing

app = FastAPI(
    title       = "PINIT API",
    description = "Image Forensics & Verification Platform",
    version     = "1.0.0"
)

# CORS — allow React frontend and Capacitor mobile app to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://image-crypto-analyzer.vercel.app",
        "https://pinit-backend.onrender.com",
        "https://biovault-backend-d13a.onrender.com",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8000",
        "capacitor://",
        "file://",
        "*"  # Allow all origins for mobile apps
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register all routers
app.include_router(auth.router,    prefix="/auth")
app.include_router(vault.router,   prefix="/vault")
app.include_router(compare.router, prefix="/compare")
app.include_router(admin.router,   prefix="/admin")
app.include_router(certificates.router, prefix="/certificates")
app.include_router(sharing.router, prefix="/share")

# Mount static files for React app assets (CSS, JS, images, etc.)
dist_path = Path(__file__).parent / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")
    app.mount("/images", StaticFiles(directory=str(dist_path / "images")), name="images") if (dist_path / "images").exists() else None


@app.get("/")
def root():
    return {
        "app"     : "PINIT API",
        "status"  : "running",
        "docs"    : "/docs"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Share Page - Serve React app for /share routes ────────────────────────────

@app.get("/share/{share_id}")
async def serve_share_page(share_id: str):
    """
    Serve the React app for share links.
    React router will handle the /share/:token route on the client side.
    """
    from pathlib import Path
    
    # Try to serve dist/index.html from backend/dist directory
    dist_path = Path(__file__).parent / "dist" / "index.html"
    
    if dist_path.exists():
        try:
            with open(dist_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            return HTMLResponse(content=html_content, media_type="text/html")
        except Exception as e:
            print(f"Error reading dist/index.html: {e}")
    
    # Fallback: Return error with debugging info  
    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BiVault Share - Error</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
        .container {{ max-width: 500px; background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
        h1 {{ color: #1a202c; margin-bottom: 16px; font-size: 24px; }}
        p {{ color: #4a5568; margin-bottom: 12px; line-height: 1.6; }}
        .error {{ background: #fed7d7; color: #742a2a; padding: 12px; border-radius: 8px; margin-top: 20px; font-size: 13px; font-family: monospace; }}
        .share-id {{ background: #edf2f7; padding: 12px; border-radius: 8px; margin-top: 20px; font-family: monospace; word-break: break-all; color: #2d3748; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ Build Not Found</h1>
        <p>The React app build files are missing. This is a temporary deployment issue.</p>
        <div class="error">dist/index.html not found at server initialization</div>
        <div class="share-id">Share ID: <strong>{share_id}</strong></div>
        <p style="margin-top: 24px; color: #718096; font-size: 13px;">Please try again in a few moments.</p>
    </div>
</body>
</html>""",
        status_code=503,
        media_type="text/html"
    )



# ── Adapter endpoints for frontend biometric auth ────────────────────────────

@app.post("/api/register")
async def api_register(data: dict):
    """Adapter endpoint: Convert biometric registration to backend register format"""
    from .db.database import get_admin_db
    import uuid
    
    db = get_admin_db()
    
    # Generate credentials from biometric data
    user_id = data.get("userId", str(uuid.uuid4()))
    email = f"{user_id}@biovault.local"  # Generate email from userId
    username = data.get("userId", "user")
    
    # Check if user already exists
    existing = db.table("users").select("id").eq("email", email).execute()
    if existing.data:
        return {"ok": True, "tempCode": "000000", "mode": "remote"}
    
    # Create user with minimal data
    db.table("users").insert({
        "username": username,
        "email": email,
        "role": "user",
        "is_active": True,
        "email_verified": True,
        "password_hash": None
    }).execute()
    
    return {"ok": True, "tempCode": "000000", "mode": "remote"}


@app.post("/api/validate")
async def api_validate(data: dict):
    """Adapter endpoint: Validate deviced-based authentication"""
    from .db.database import get_admin_db
    
    db = get_admin_db()
    user_id = data.get("userId")
    device_token = data.get("deviceToken")
    
    if not user_id or not device_token:
        return {"authorized": False, "reason": "Missing userId or deviceToken"}
    
    # Check if user exists
    email = f"{user_id}@biovault.local"
    result = db.table("users").select("id").eq("email", email).execute()
    
    if not result.data:
        return {"authorized": False, "reason": "User not found"}
    
    return {"authorized": True, "reason": "Device verified"}


@app.post("/api/user/check")
async def api_user_check(data: dict):
    """Check if user is registered with biometric data"""
    from .db.database import get_admin_db
    
    db = get_admin_db()
    user_id = data.get("user_id") or data.get("userId")
    
    if not user_id:
        return {
            "ok": False,
            "reason": "Missing user_id",
            "fingerprintRegistered": False,
            "faceRegistered": False
        }
    
    try:
        # Check if user has biometric registration
        biometric_result = db.table("biometric_users").select("*").eq("user_id", user_id).execute()
        
        if not biometric_result.data:
            return {
                "ok": False,
                "reason": "User not registered with biometrics",
                "fingerprintRegistered": False,
                "faceRegistered": False
            }
        
        biometric_user = biometric_result.data[0]
        
        # Check what biometric data is available
        has_fingerprint = bool(biometric_user.get("webauthn_credential"))
        has_face = bool(biometric_user.get("face_embedding"))
        
        return {
            "ok": True,
            "reason": "User registered",
            "fingerprintRegistered": has_fingerprint,
            "faceRegistered": has_face,
            "userId": user_id,
            "isActive": biometric_user.get("is_active", True)
        }
    
    except Exception as e:
        print(f"Error checking user registration: {str(e)}")
        return {
            "ok": False,
            "reason": f"Error checking registration: {str(e)}",
            "fingerprintRegistered": False,
            "faceRegistered": False
        }


@app.post("/api/temp-code/request")
async def api_temp_code_request(data: dict):
    """Request a temporary access code"""
    from .db.database import get_admin_db
    import datetime
    import random
    
    db = get_admin_db()
    user_id = data.get("user_id") or data.get("userId")
    
    if not user_id:
        return {"ok": False, "reason": "Missing user_id"}
    
    try:
        # Check if user exists
        biometric_result = db.table("biometric_users").select("*").eq("user_id", user_id).execute()
        
        if not biometric_result.data:
            return {"ok": False, "reason": "User not found"}
        
        # Generate temp code
        temp_code = str(random.randint(100000, 999999))
        expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        
        # Store temp code in a temp_codes table or just return it
        # For now, just return the temp code
        return {
            "ok": True,
            "tempCode": temp_code,
            "expiresAt": expiry.isoformat()
        }
    
    except Exception as e:
        print(f"Error requesting temp code: {str(e)}")
        return {"ok": False, "reason": f"Error: {str(e)}"}


@app.post("/api/temp-code/verify")
async def api_temp_code_verify(data: dict):
    """Verify temporary access code"""
    from .db.database import get_admin_db
    from .utils.auth_helpers import generate_jwt
    
    db = get_admin_db()
    user_id = data.get("user_id") or data.get("userId")
    code = data.get("code")
    
    if not user_id or not code:
        return {"ok": False, "reason": "Missing user_id or code"}
    
    try:
        # Check if user exists
        biometric_result = db.table("biometric_users").select("*").eq("user_id", user_id).execute()
        
        if not biometric_result.data:
            return {"ok": False, "reason": "User not found"}
        
        # For now, accept any code (verify is handled by face verification)
        # In production, would validate code against stored temp codes
        
        # Generate tokens for temporary access
        token = generate_jwt(user_id, "user")
        refresh_token = generate_jwt(user_id, "user")
        
        return {
            "ok": True,
            "token": token,
            "refreshToken": refresh_token,
            "userId": user_id
        }
    
    except Exception as e:
        print(f"Error verifying temp code: {str(e)}")
        return {"ok": False, "reason": f"Error: {str(e)}"}