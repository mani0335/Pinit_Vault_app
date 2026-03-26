from fastapi import APIRouter, HTTPException, Depends, Request
from db.database import get_admin_db
from models.schemas import VaultImageCreate, VaultImageResponse
from utils.auth_helpers import get_current_user, log_action
from utils.cloudinary_helper import upload_thumbnail_base64, delete_thumbnail

router = APIRouter(tags=["Vault"])


@router.post("/save")
async def save_vault_image(
    data: VaultImageCreate,
    request: Request,
    current_user=Depends(get_current_user)
):
    db = get_admin_db()

    # Check if asset_id already exists
    existing = db.table("vault_images").select("id") \
        .eq("asset_id", data.asset_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Asset already in vault")

    # Upload thumbnail to Cloudinary if provided
    thumbnail_url = None
    if data.thumbnail_base64:
        result = upload_thumbnail_base64(data.thumbnail_base64, data.asset_id)
        if result["success"]:
            thumbnail_url = result["url"]

    # Save to Supabase
    record = db.table("vault_images").insert({
        "user_id"            : current_user["id"],
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
        "capture_timestamp"  : data.capture_timestamp
    }).execute()

    log_action(
        current_user["id"], "vault_save",
        {"asset_id": data.asset_id},
        str(request.client.host)
    )

    return {"message": "Saved to vault", "data": record.data[0]}


@router.get("/list")
async def list_vault_images(current_user=Depends(get_current_user)):
    db      = get_admin_db()
    result  = db.table("vault_images") \
        .select("*") \
        .eq("user_id", current_user["id"]) \
        .order("created_at", desc=True) \
        .execute()
    return {"assets": result.data, "total": len(result.data)}


@router.get("/verify/{file_hash}")
async def verify_by_hash(file_hash: str):
    """Cross-device verification — no login needed"""
    db     = get_admin_db()
    result = db.table("vault_images").select("*") \
        .eq("file_hash", file_hash).execute()

    if not result.data:
        return {"found": False, "message": "Image not found in any vault"}

    asset = result.data[0]
    return {
        "found"       : True,
        "asset_id"    : asset["asset_id"],
        "owner_name"  : asset["owner_name"],
        "certificate" : asset["certificate_id"],
        "registered"  : asset["created_at"],
        "resolution"  : asset["resolution"],
        "thumbnail"   : asset["thumbnail_url"]
    }


@router.get("/{asset_id}")
async def get_vault_image(asset_id: str, current_user=Depends(get_current_user)):
    db     = get_admin_db()
    result = db.table("vault_images").select("*") \
        .eq("asset_id", asset_id) \
        .eq("user_id", current_user["id"]) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    return result.data[0]


@router.delete("/{asset_id}")
async def delete_vault_image(
    asset_id: str,
    request: Request,
    current_user=Depends(get_current_user)
):
    db = get_admin_db()

    existing = db.table("vault_images").select("*") \
        .eq("asset_id", asset_id) \
        .eq("user_id", current_user["id"]) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Delete from Cloudinary
    delete_thumbnail(asset_id)

    # Delete from Supabase
    db.table("vault_images").delete().eq("asset_id", asset_id).execute()

    log_action(
        current_user["id"], "vault_delete",
        {"asset_id": asset_id},
        str(request.client.host)
    )

    return {"message": "Asset deleted"}


@router.get("/search/query")
async def search_vault(q: str, current_user=Depends(get_current_user)):
    db     = get_admin_db()
    result = db.table("vault_images").select("*") \
        .eq("user_id", current_user["id"]) \
        .or_(f"file_name.ilike.%{q}%,owner_name.ilike.%{q}%,asset_id.ilike.%{q}%") \
        .execute()
    return {"results": result.data}