from fastapi import APIRouter, HTTPException, Depends, Request
from ..db.database import get_admin_db
from ..models.schemas import SuspendUser
from ..utils.auth_helpers import get_admin_user, log_action

router = APIRouter(tags=["Admin"])


@router.get("/users")
async def get_all_users(admin=Depends(get_admin_user)):
    db     = get_admin_db()
    result = db.table("users").select("*") \
        .order("created_at", desc=True).execute()
    return {"users": result.data, "total": len(result.data)}


@router.get("/vault")
async def get_all_vault_images(admin=Depends(get_admin_user)):
    db     = get_admin_db()
    result = db.table("vault_images").select("*") \
        .order("created_at", desc=True).execute()
    return {"assets": result.data, "total": len(result.data)}


@router.get("/reports")
async def get_all_reports(admin=Depends(get_admin_user)):
    db     = get_admin_db()
    result = db.table("comparison_reports").select("*") \
        .order("created_at", desc=True).execute()
    return {"reports": result.data, "total": len(result.data)}


@router.patch("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    data: SuspendUser,
    request: Request,
    admin=Depends(get_admin_user)
):
    db = get_admin_db()

    user = db.table("users").select("*").eq("id", user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    db.table("users").update({"is_active": False}).eq("id", user_id).execute()

    log_action(
        admin["id"], "suspend_user",
        {"target_user": user_id, "reason": data.reason},
        str(request.client.host)
    )

    return {"message": "User suspended"}


@router.patch("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    request: Request,
    admin=Depends(get_admin_user)
):
    db = get_admin_db()
    db.table("users").update({"is_active": True}).eq("id", user_id).execute()

    log_action(
        admin["id"], "activate_user",
        {"target_user": user_id},
        str(request.client.host)
    )

    return {"message": "User activated"}


@router.get("/audit-log")
async def get_audit_log(admin=Depends(get_admin_user)):
    db     = get_admin_db()
    result = db.table("audit_log").select("*") \
        .order("created_at", desc=True).limit(500).execute()
    return {"logs": result.data}


@router.get("/stats")
async def get_stats(admin=Depends(get_admin_user)):
    db = get_admin_db()

    users   = db.table("users").select("id", count="exact").execute()
    assets  = db.table("vault_images").select("id", count="exact").execute()
    reports = db.table("comparison_reports").select("id", count="exact").execute()
    tampered = db.table("comparison_reports").select("id", count="exact") \
        .eq("is_tampered", True).execute()

    return {
        "total_users"    : users.count,
        "total_assets"   : assets.count,
        "total_reports"  : reports.count,
        "tampered_found" : tampered.count
    }


@router.post("/setup/vault-table")
async def setup_vault_table():
    """
    ⚠️ PUBLIC ENDPOINT - DO NOT USE IN PRODUCTION
    Creates vault_images table if it doesn't exist.
    Run this once during initial setup.
    """
    try:
        db = get_admin_db()
        
        print("🔨 Setting up vault_images table...")
        
        # Create table via Supabase
        # Supabase Python client doesn't have direct SQL execution
        # So we'll try to detect if table exists by attempting a query
        
        try:
            result = db.table("vault_images").select("id").limit(1).execute()
            print("✅ vault_images table already exists!")
            return {"status": "exists", "message": "vault_images table already exists"}
        except Exception as e:
            if "vault_images" in str(e):
                print(f"⚠️ Table doesn't exist yet: {e}")
                print("📝 You must manually create the table in Supabase SQL Editor:")
                print("   1. Go to https://app.supabase.com")
                print("   2. Select your project")
                print("   3. Go to SQL Editor")
                print("   4. Click 'New Query'")
                print("   5. Copy and run the SQL from backend/CREATE_VAULT_TABLE.sql")
                
                return {
                    "status": "needs_setup",
                    "message": "Table needs manual setup via Supabase SQL Editor",
                    "sql_file": "backend/CREATE_VAULT_TABLE.sql",
                    "instructions": [
                        "1. Go to https://app.supabase.com",
                        "2. Select your project (wdvsfjpkxfjaelrydgqd)",
                        "3. Go to SQL Editor > New Query",
                        "4. Copy SQL from backend/CREATE_VAULT_TABLE.sql",
                        "5. Run the query"
                    ]
                }
            else:
                raise
    except Exception as e:
        print(f"❌ Setup failed: {str(e)}")
        return {
            "status": "error",
            "message": f"Setup failed: {str(e)}",
            "error": str(e)
        }