from fastapi import APIRouter, HTTPException, Depends, Request
from db.database import get_admin_db
from models.schemas import ComparisonReportCreate
from utils.auth_helpers import get_current_user, log_action
import secrets

router = APIRouter(tags=["Comparison"])


@router.post("/save")
async def save_report(
    data: ComparisonReportCreate,
    request: Request,
    current_user=Depends(get_current_user)
):
    db           = get_admin_db()
    public_token = secrets.token_hex(32)

    record = db.table("comparison_reports").insert({
        "asset_id"              : data.asset_id,
        "compared_by"           : current_user["id"],
        "is_tampered"           : data.is_tampered,
        "confidence"            : data.confidence,
        "visual_verdict"        : data.visual_verdict,
        "editing_tool"          : data.editing_tool,
        "changes"               : data.changes,
        "pixel_analysis"        : data.pixel_analysis,
        "original_capture_time" : data.original_capture_time,
        "modified_file_time"    : data.modified_file_time,
        "uploaded_resolution"   : data.uploaded_resolution,
        "uploaded_size"         : data.uploaded_size,
        "phash_sim"             : data.phash_sim,
        "public_token"          : public_token
    }).execute()

    log_action(
        current_user["id"], "comparison",
        {"asset_id": data.asset_id, "tampered": data.is_tampered},
        str(request.client.host)
    )

    return {
        "message"      : "Report saved",
        "report_id"    : record.data[0]["id"],
        "public_token" : public_token
    }


@router.get("/public/{token}")
async def get_public_report(token: str):
    """Anyone with this link can view — no login needed"""
    db     = get_admin_db()
    result = db.table("comparison_reports").select("*") \
        .eq("public_token", token).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found")
    return result.data[0]


@router.get("/history")
async def get_my_reports(current_user=Depends(get_current_user)):
    db     = get_admin_db()
    result = db.table("comparison_reports").select("*") \
        .eq("compared_by", current_user["id"]) \
        .order("created_at", desc=True) \
        .execute()
    return {"reports": result.data}


@router.get("/{asset_id}")
async def get_reports_for_asset(
    asset_id: str,
    current_user=Depends(get_current_user)
):
    db     = get_admin_db()
    result = db.table("comparison_reports").select("*") \
        .eq("asset_id", asset_id) \
        .eq("compared_by", current_user["id"]) \
        .order("created_at", desc=True) \
        .execute()
    return {"reports": result.data}