from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from ..db.database import get_admin_db
from ..models.schemas import VaultImageCreate, VaultImageResponse
from ..utils.auth_helpers import log_action
from ..utils.cloudinary_helper import upload_thumbnail_base64, delete_thumbnail, download_image

router = APIRouter(tags=["Vault"])


@router.post("/save")
async def save_vault_image(
    data: VaultImageCreate,
    request: Request
):
    """
    Save an encrypted image to vault.
    No authentication required - uses user_id from request body for authorization.
    """
    db = get_admin_db()
    
    # Use user_id from request body (provided by frontend)
    user_id = data.user_id
    print(f"✅ Vault Save: Saving for user - {user_id}")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")

    # Check if asset_id already exists
    try:
        existing = db.table("vault_images").select("id") \
            .eq("asset_id", data.asset_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Asset already in vault")
    except Exception as e:
        print(f"❌ Vault Save: Check existing failed - {str(e)}")
        # Continue anyway

    # Upload thumbnail to Cloudinary if provided
    thumbnail_url = None
    image_url = None
    upload_attempted = False
    upload_error = None
    
    if data.thumbnail_base64:
        upload_attempted = True
        try:
            print(f"📤 Vault Save: Attempting Cloudinary upload for {data.asset_id}")
            result = upload_thumbnail_base64(data.thumbnail_base64, data.asset_id)
            if result["success"]:
                thumbnail_url = result["url"]
                image_url = thumbnail_url  # Use same URL for image
                print(f"✅ Vault Save: Image successfully uploaded - {thumbnail_url}")
            else:
                upload_error = result.get("error", "Unknown upload error")
                print(f"⚠️ Vault Save: Cloudinary upload failed - {upload_error}")
                # Still continue - will use base64 fallback
        except Exception as e:
            upload_error = str(e)
            print(f"⚠️ Vault Save: Image upload exception - {upload_error}")
            # Still continue - will use base64 fallback

    # Save to Supabase
    try:
        record = db.table("vault_images").insert({
            "user_id"  : user_id,
            "asset_id"           : data.asset_id,
            "certificate_id"     : data.certificate_id,
            "owner_name"         : data.owner_name,
            "owner_email"        : data.owner_email,
            "file_hash"          : data.file_hash,
            "visual_fingerprint" : data.visual_fingerprint,
            "blockchain_anchor"  : data.blockchain_anchor,
            "resolution"         : data.resolution,
            "file_size"          : data.file_size,
            "file_name"          : data.file_name,
            "thumbnail_url"      : thumbnail_url,
            "image_url"          : image_url,
            "image_base64"       : data.image_base64 or data.thumbnail_base64,  # Store full image
            "capture_timestamp"  : data.capture_timestamp
        }).execute()
        
        print(f"✅ Vault Save: Image saved successfully - {data.asset_id}")
        
        log_action(
            user_id=user_id,
            action="vault_save",
            details={"asset_id": data.asset_id},
            ip=str(request.client.host)
        )
        
        return {"message": "Saved to vault", "data": record.data[0]}
        
    except Exception as e:
        print(f"❌ Vault Save: Database insert failed - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save to vault: {str(e)}")


@router.get("/list")
async def list_vault_images(user_id: str = None):
    """
    List vault images for a user.
    Uses user_id from query parameter.
    """
    db = get_admin_db()
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    print(f"✅ Vault List: Loading images for user - {user_id}")
    
    try:
        result = db.table("vault_images") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        print(f"✅ Vault List: Found {len(result.data)} images")
        return {"assets": result.data, "total": len(result.data)}
    except Exception as e:
        print(f"❌ Vault List: Failed - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load vault: {str(e)}")


@router.get("/{asset_id}")
async def get_vault_image(asset_id: str, user_id: str = None):
    """Get a vault image. Uses user_id from query parameter."""
    db = get_admin_db()
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    try:
        result = db.table("vault_images").select("*") \
            .eq("asset_id", asset_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Asset not found")
        return result.data[0]
    except Exception as e:
        print(f"❌ Vault Get: Failed - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get vault image: {str(e)}")


@router.get("/{asset_id}/download")
async def download_vault_image(asset_id: str, user_id: str = None):
    """
    Download vault image as file (JPG, PNG, etc.).
    Requires user_id from query parameter.
    """
    db = get_admin_db()
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    try:
        print(f"📥 Vault Download: Starting for asset_id={asset_id}, user_id={user_id}")
        
        # Verify ownership
        result = db.table("vault_images").select("*") \
            .eq("asset_id", asset_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            print(f"❌ Vault Download: Asset not found")
            raise HTTPException(status_code=403, detail="Asset not found or access denied")
        
        asset = result.data[0]
        file_name = asset.get("file_name", "image")
        
        print(f"✅ Vault Download: Found asset - {file_name}")
        
        # IMPORTANT: Download ORIGINAL full-resolution image from database, NOT compressed Cloudinary thumbnail
        # Cloudinary is only for preview/thumbnails (400x400)
        print(f"📥 Serving ORIGINAL full-resolution image from database")
        image_base64 = asset.get("image_base64")
        
        if not image_base64:
            print(f"⚠️ No image_base64 in database, trying thumbnail_base64 fallback")
            image_base64 = asset.get("thumbnail_base64")
        
        if not image_base64:
            error_msg = "No image data stored in vault"
            print(f"❌ {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        
        print(f"✅ Found image in database, size: {len(image_base64)} bytes")
        
        # Decode base64 and serve
        import base64
        if image_base64.startswith("data:"):
            # It's a data URL, extract the base64 part
            image_base64 = image_base64.split(",")[1]
        
        image_bytes = base64.b64decode(image_base64)
        print(f"📊 Decoded image: {len(image_bytes)} bytes")
        
        # Detect format from filename
        content_type = "image/jpeg"
        file_format = "jpg"
        if ".png" in file_name.lower():
            content_type = "image/png"
            file_format = "png"
        elif ".webp" in file_name.lower():
            content_type = "image/webp"
            file_format = "webp"
        elif ".gif" in file_name.lower():
            content_type = "image/gif"
            file_format = "gif"
        
        print(f"✅ Sending original image: {file_name} ({content_type})")
        
        return StreamingResponse(
            iter([image_bytes]),
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file_name}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Vault Download: Unexpected error - {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to download image: {str(e)}")


@router.delete("/{asset_id}")
async def delete_vault_image(asset_id: str, request: Request, user_id: str = None):
    """Delete a vault image. Uses user_id from query parameter."""
    db = get_admin_db()
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")

    try:
        existing = db.table("vault_images").select("*") \
            .eq("asset_id", asset_id) \
            .eq("user_id", user_id) \
            .execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Asset not found")

        # Delete from Cloudinary
        try:
            delete_thumbnail(asset_id)
        except:
            pass

        # Delete from Supabase
        db.table("vault_images").delete().eq("asset_id", asset_id).execute()

        log_action(
            user_id=user_id,
            action="vault_delete",
            details={"asset_id": asset_id},
            ip=str(request.client.host)
        )
        
        print(f"✅ Vault Delete: Image deleted - {asset_id}")
        return {"message": "Asset deleted"}
    except Exception as e:
        print(f"❌ Vault Delete: Failed - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")


@router.get("/verify/{file_hash}")
async def verify_by_hash(file_hash: str):
    """Cross-device verification — no login needed"""
    try:
        db = get_admin_db()
        result = db.table("vault_images").select("*") \
            .eq("file_hash", file_hash).execute()

        if not result.data:
            return {"found": False, "message": "Image not found in any vault"}

        asset = result.data[0]
        return {
            "found": True,
            "asset_id": asset["asset_id"],
            "owner_name": asset["owner_name"],
            "certificate": asset["certificate_id"],
            "registered": asset["created_at"],
            "resolution": asset["resolution"],
            "thumbnail": asset["thumbnail_url"]
        }
    except Exception as e:
        print(f"❌ Vault Verify: Failed - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to verify: {str(e)}")


@router.get("/search/query")
async def search_vault(q: str, user_id: str = None):
    """Search vault images for a user."""
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    try:
        db = get_admin_db()
        result = db.table("vault_images").select("*") \
            .eq("user_id", user_id) \
            .or_(f"file_name.ilike.%{q}%,owner_name.ilike.%{q}%,asset_id.ilike.%{q}%") \
            .execute()
        return {"results": result.data}
    except Exception as e:
        print(f"❌ Vault Search: Failed - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search: {str(e)}")