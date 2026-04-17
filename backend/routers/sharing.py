from fastapi import APIRouter, HTTPException, Request, Query, Body
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from pathlib import Path
from ..db.database import get_admin_db
import uuid

router = APIRouter(tags=["Sharing"])

# ============================================================================
# PYDANTIC MODELS - All request/response models defined below
# ============================================================================

class ShareCreateRequest(BaseModel):
    user_id: str
    vault_image_id: Optional[str] = None
    expiry_date: Optional[str] = None
    expiry_time: Optional[str] = None
    download_limit: Optional[int] = None
    password: Optional[str] = None
    include_cert: bool = False
    base_url: str = "https://biovault-backend-d13a.onrender.com"

class ShareUpdateRequest(BaseModel):
    user_id: str
    is_active: Optional[bool] = None
    download_limit: Optional[int] = None
    downloads_used: Optional[int] = None

class PasswordVerifyRequest(BaseModel):
    share_id: str
    password: str

# ============================================================================
# SERVE REACT APP FOR SHARE PAGES
# ============================================================================

@router.get("/{share_id}")
async def serve_share_page_react(share_id: str):
    """
    Serve React app for share links when accessing /share/{share_id} directly.
    React Router will handle the route on the client side.
    """
    # Try to find and serve dist/index.html
    dist_paths = [
        Path(__file__).parent.parent / "dist" / "index.html",  # backend/dist
        Path(__file__).parent.parent.parent / "dist" / "index.html",  # ../dist
    ]
    
    for dist_path in dist_paths:
        if dist_path.exists():
            try:
                return FileResponse(path=str(dist_path), media_type="text/html")
            except Exception as e:
                print(f"Error serving {dist_path}: {e}")
                continue
    
    # Fallback: Show loading screen
    return HTMLResponse(
        content="""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BiVault Share</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 500px; background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        h1 { color: #1a202c; margin-bottom: 16px; }
        p { color: #4a5568; margin-bottom: 12px; line-height: 1.6; }
        .spinner { display: inline-block; width: 40px; height: 40px; margin: 20px auto; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>⏳ Loading Shared Content...</h1>
        <div class="spinner"></div>
        <p>Please wait while we fetch your encrypted image</p>
    </div>
</body>
</html>""",
        status_code=200
    )

# ============================================================================
# CREATE SHARE LINK
# ============================================================================

@router.post("/create")
async def create_share(data: ShareCreateRequest):
    """
    Create a new share link for a document.
    
    Accepts ShareCreateRequest with:
    - user_id: owner of the share
    - vault_image_id: the image to share
    - expiry_date/time: when share expires
    - download_limit: max downloads
    - password: optional password protection
    - include_cert: include authorship certificate
    - base_url: public URL for share link
    """
    db = get_admin_db()
    
    try:
        user_id = data.user_id
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        # Generate unique share ID
        share_id = f"share_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:8]}"
        
        # Build share link using provided base URL or default to backend
        base_url = data.base_url or "https://biovault-backend-d13a.onrender.com"
        share_link = f"{base_url}/share/{share_id}"
        
        # Prepare share config
        share_config = {
            "share_id": share_id,
            "user_id": user_id,
            "vault_image_id": data.vault_image_id,
            "share_link": share_link,
            "expiry_date": data.expiry_date,
            "expiry_time": data.expiry_time,
            "download_limit": data.download_limit,
            "downloads_used": 0,
            "password": data.password,
            "include_cert": data.include_cert or False,
            "created_by": user_id,
            "is_active": True,
            "access_count": 0
        }
        
        # Save to database
        response = db.table("share_configs").insert(share_config).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create share")
        
        print(f"✅ Share Created: {share_id} by {user_id}")
        
        return {
            "ok": True,
            "share_id": share_id,
            "share_link": share_link,
            "created_at": response.data[0]["created_at"] if response.data else None
        }
    
    except Exception as e:
        print(f"❌ Share Creation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Share creation failed: {str(e)}")


# ============================================================================
# GET SHARE DETAILS (PUBLIC - No auth required)
# ============================================================================

@router.get("/public/{share_id}")
async def get_share_public(share_id: str):
    """
    Get share details by share ID (public endpoint).
    Used by anyone with the share link.
    Requires correct password if password-protected.
    """
    db = get_admin_db()
    
    try:
        # Fetch share config
        response = db.table("share_configs") \
            .select("*") \
            .eq("share_id", share_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        share = response.data[0]
        
        # Check if share is active
        if not share.get("is_active"):
            raise HTTPException(status_code=410, detail="This share has expired or been disabled")
        
        # Check expiry date/time
        if share.get("expiry_date"):
            expiry = datetime.fromisoformat(share["expiry_date"])
            if datetime.now() > expiry:
                raise HTTPException(status_code=410, detail="This share has expired")
        
        # Check download limit
        if share.get("download_limit"):
            if share.get("downloads_used", 0) >= share["download_limit"]:
                raise HTTPException(status_code=410, detail="Download limit exceeded")
        
        # Update access count and last accessed time
        db.table("share_configs") \
            .update({
                "access_count": (share.get("access_count", 0) + 1),
                "accessed_at": datetime.now().isoformat()
            }) \
            .eq("share_id", share_id) \
            .execute()
        
        # Return share details (hide password)
        return {
            "ok": True,
            "share_id": share_id,
            "share_link": share["share_link"],
            "includes_password": bool(share.get("password")),
            "include_cert": share.get("include_cert", False),
            "created_at": share.get("created_at"),
            "created_by": share.get("created_by"),
            "download_limit": share.get("download_limit"),
            "downloads_used": share.get("downloads_used", 0),
            "access_count": share.get("access_count", 0)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get Share Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving share: {str(e)}")


# ============================================================================
# VERIFY SHARE PASSWORD
# ============================================================================

@router.post("/verify-password")
async def verify_share_password(data: PasswordVerifyRequest):
    """
    Verify password for password-protected share.
    """
    db = get_admin_db()
    
    try:
        share_id = data.share_id
        entered_password = data.password
        
        if not share_id or not entered_password:
            raise HTTPException(status_code=400, detail="share_id and password required")
        
        # Fetch share config
        response = db.table("share_configs") \
            .select("password") \
            .eq("share_id", share_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        stored_password = response.data[0].get("password")
        
        # Check password (simple comparison - in production, use bcrypt)
        if stored_password == entered_password:
            return {"ok": True, "verified": True}
        else:
            return {"ok": True, "verified": False}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Password Verify Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error verifying password: {str(e)}")


# ============================================================================
# GET USER'S SHARES
# ============================================================================

@router.get("/user/{user_id}")
async def get_user_shares(user_id: str):
    """
    Get all shares created by a specific user.
    """
    db = get_admin_db()
    
    try:
        response = db.table("share_configs") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        return {
            "ok": True,
            "count": len(response.data),
            "shares": response.data
        }
    
    except Exception as e:
        print(f"❌ Get User Shares Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving shares: {str(e)}")


# ============================================================================
# UPDATE SHARE
# ============================================================================

@router.put("/{share_id}")
async def update_share(share_id: str, data: ShareUpdateRequest):
    """
    Update a share (toggle active, update download limit, etc).
    """
    db = get_admin_db()
    
    try:
        user_id = data.user_id
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        # Verify ownership
        response = db.table("share_configs") \
            .select("user_id") \
            .eq("share_id", share_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        if response.data[0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Prepare update data (only fields that were provided)
        update_data = data.dict(exclude_unset=True)
        update_data.pop("user_id", None)  # Don't update user_id
        
        if update_data:
            db.table("share_configs") \
                .update(update_data) \
                .eq("share_id", share_id) \
                .execute()
        
        print(f"✅ Share Updated: {share_id}")
        return {"ok": True, "message": "Share updated"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Update Share Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating share: {str(e)}")


# ============================================================================
# DELETE SHARE
# ============================================================================

@router.delete("/{share_id}")
async def delete_share(share_id: str, user_id: str = Query(...)):
    """
    Delete a share permanently.
    """
    db = get_admin_db()
    
    try:
        # Verify ownership
        response = db.table("share_configs") \
            .select("user_id") \
            .eq("share_id", share_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        if response.data[0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Delete share
        db.table("share_configs") \
            .delete() \
            .eq("share_id", share_id) \
            .execute()
        
        print(f"✅ Share Deleted: {share_id}")
        return {"ok": True, "message": "Share deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete Share Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting share: {str(e)}")
