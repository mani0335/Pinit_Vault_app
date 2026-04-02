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
    if data.thumbnail_base64:
        try:
            result = upload_thumbnail_base64(data.thumbnail_base64, data.asset_id)
            if result["success"]:
                thumbnail_url = result["url"]
                image_url = thumbnail_url  # Use same URL for image
                print(f"📷 Vault Save: Image uploaded - {thumbnail_url}")
        except Exception as e:
            print(f"⚠️ Vault Save: Image upload failed - {str(e)}")

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
        # Verify ownership
        result = db.table("vault_images").select("*") \
            .eq("asset_id", asset_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=403, detail="Asset not found or access denied")
        
        asset = result.data[0]
        file_name = asset.get("file_name", "image")
        
        # Download from Cloudinary
        download_result = download_image(asset_id)
        
        if not download_result["success"]:
            raise HTTPException(status_code=500, detail=f"Failed to download image: {download_result['error']}")
        
        # Stream file with download headers
        return StreamingResponse(
            iter([download_result["data"]]),
            media_type=download_result["content_type"],
            headers={
                "Content-Disposition": f'attachment; filename="{file_name}.{download_result["format"]}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Vault Download: Failed - {str(e)}")
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