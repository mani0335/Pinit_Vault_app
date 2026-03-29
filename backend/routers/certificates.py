from fastapi import APIRouter, HTTPException, Depends
from ..db.database import get_admin_db
from ..utils.auth_helpers import get_current_user, log_action

router = APIRouter(tags=["Certificates"])


@router.post("/save")
async def save_certificate(data: dict, current_user=Depends(get_current_user)):
    db = get_admin_db()
    try:
        existing = db.table("certificates") \
            .select("id") \
            .eq("certificate_id", data.get("certificate_id", "")) \
            .execute()

        if existing.data:
            return {"message": "Certificate already exists", "id": existing.data[0]["id"]}

        result = db.table("certificates").insert({
            "user_id"       : current_user["id"],
            "certificate_id": data.get("certificate_id"),
            "asset_id"      : data.get("asset_id"),
            "confidence"    : data.get("confidence"),
            "status"        : data.get("status"),
            "analysis_data" : data.get("analysis_data", {}),
            "image_preview" : data.get("image_preview"),
        }).execute()

        log_action(current_user["id"], "certificate_saved",
                   {"certificate_id": data.get("certificate_id")})
        return {"message": "Certificate saved", "data": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_certificates(current_user=Depends(get_current_user)):
    db = get_admin_db()
    result = db.table("certificates") \
        .select("*") \
        .eq("user_id", current_user["id"]) \
        .order("created_at", desc=True) \
        .execute()
    return {"certificates": result.data or []}


@router.delete("/{certificate_id}")
async def delete_certificate(certificate_id: str, current_user=Depends(get_current_user)):
    db = get_admin_db()
    db.table("certificates") \
        .delete() \
        .eq("certificate_id", certificate_id) \
        .eq("user_id", current_user["id"]) \
        .execute()
    return {"message": "Certificate deleted"}