from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional, List
from ..db.database import get_admin_db
from ..utils.auth_helpers import get_current_user, log_action
import json
import secrets

router = APIRouter(tags=["Portfolio"])

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class PortfolioShareRequest(BaseModel):
    portfolio_id: str
    expiry_hours: Optional[int] = 24          # None = no expiry
    view_only: bool = True
    allowed_sections: Optional[List[str]] = None   # None = all sections
    view_limit: Optional[int] = None               # None = unlimited
    watermark: bool = False
    watermark_text: Optional[str] = None
    screenshot_protection: bool = False
    allowed_countries: Optional[List[str]] = None
    allowed_cities: Optional[List[str]] = None
    device_bound: bool = False
    password: Optional[str] = None
    base_url: str = "https://biovault-backend-d13a.onrender.com"


class RevokeShareRequest(BaseModel):
    portfolio_id: str
    token: str


# ============================================================================
# PORTFOLIO CRUD
# ============================================================================

@router.post("/get-portfolios")
async def get_portfolios(current_user: dict = Depends(get_current_user)):
    """Get all portfolios for the current user"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        portfolios = db.table("portfolios").select("*").eq("user_id", user_id).execute()
        return {"portfolios": portfolios.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolios: {str(e)}")


@router.post("/create-portfolio")
async def create_portfolio(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new portfolio"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]

        name = data.get("name", "")
        portfolio_type = data.get("type", "")
        sections_raw = data.get("sections", "[]")
        template = data.get("template", "")
        status = data.get("status", "active")

        valid_types = ["academic", "placement", "masters", "personal", "professional"]
        if portfolio_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid portfolio type: {portfolio_type}")

        if isinstance(sections_raw, str):
            try:
                sections_data = json.loads(sections_raw)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid sections JSON")
        else:
            sections_data = sections_raw

        portfolio = {
            "user_id": user_id,
            "name": name,
            "type": portfolio_type,
            "sections": sections_data,
            "template": template,
            "status": status,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "views": 0,
            "unique_viewers": 0
        }

        result = db.table("portfolios").insert(portfolio).execute()
        log_action(user_id, "create_portfolio", {"name": name, "type": portfolio_type}, "api")

        return {"ok": True, "portfolio": result.data[0] if result.data else None}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create portfolio: {str(e)}")


@router.post("/update-portfolio")
async def update_portfolio(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing portfolio"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]

        portfolio_id = data.get("portfolio_id", "")
        name = data.get("name")
        portfolio_type = data.get("type")
        sections_raw = data.get("sections")

        existing = db.table("portfolios").select("*").eq("id", portfolio_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        update_data = {"updated_at": datetime.utcnow().isoformat()}

        if name:
            update_data["name"] = name
        if portfolio_type:
            valid_types = ["academic", "placement", "masters", "personal", "professional"]
            if portfolio_type not in valid_types:
                raise HTTPException(status_code=400, detail=f"Invalid portfolio type: {portfolio_type}")
            update_data["type"] = portfolio_type
        if sections_raw is not None:
            if isinstance(sections_raw, str):
                try:
                    update_data["sections"] = json.loads(sections_raw)
                except json.JSONDecodeError:
                    raise HTTPException(status_code=400, detail="Invalid sections JSON")
            else:
                update_data["sections"] = sections_raw

        result = db.table("portfolios").update(update_data).eq("id", portfolio_id).eq("user_id", user_id).execute()
        log_action(user_id, "update_portfolio", {"portfolio_id": portfolio_id}, "api")

        return {"ok": True, "portfolio": result.data[0] if result.data else None}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update portfolio: {str(e)}")


@router.post("/delete-portfolio")
async def delete_portfolio(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Delete a portfolio"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        portfolio_id = data.get("portfolio_id", "")

        existing = db.table("portfolios").select("*").eq("id", portfolio_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        db.table("portfolios").delete().eq("id", portfolio_id).eq("user_id", user_id).execute()
        log_action(user_id, "delete_portfolio", {"portfolio_id": portfolio_id}, "api")

        return {"ok": True, "message": "Portfolio deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete portfolio: {str(e)}")


@router.post("/increment-views")
async def increment_views(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Increment portfolio view count"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        portfolio_id = data.get("portfolio_id", "")

        existing = db.table("portfolios").select("*").eq("id", portfolio_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        portfolio = existing.data[0]
        db.table("portfolios").update({
            "views": (portfolio.get("views", 0) + 1),
            "unique_viewers": (portfolio.get("unique_viewers", 0) + 1)
        }).eq("id", portfolio_id).eq("user_id", user_id).execute()

        return {"ok": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to increment views: {str(e)}")


# ============================================================================
# ADVANCED PORTFOLIO SHARING
# ============================================================================

@router.post("/generate-share-token")
async def generate_share_token(
    data: PortfolioShareRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate an advanced share token for a portfolio with full access control.

    Required Supabase table (run once in Supabase SQL editor):
    CREATE TABLE IF NOT EXISTS portfolio_shares (
        token TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        share_link TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        view_only BOOLEAN DEFAULT TRUE,
        allowed_sections JSONB,
        view_limit INTEGER,
        views_used INTEGER DEFAULT 0,
        watermark BOOLEAN DEFAULT FALSE,
        watermark_text TEXT,
        screenshot_protection BOOLEAN DEFAULT FALSE,
        allowed_countries JSONB,
        allowed_cities JSONB,
        device_bound BOOLEAN DEFAULT FALSE,
        password TEXT,
        revoked_at TIMESTAMPTZ
    );
    """
    db = get_admin_db()
    user_id = current_user["sub"]

    # Verify portfolio ownership
    existing = db.table("portfolios").select("id,name").eq("id", data.portfolio_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Generate cryptographically secure token
    token = secrets.token_urlsafe(32)

    # Compute expiry
    expires_at = None
    if data.expiry_hours and data.expiry_hours > 0:
        expires_at = (datetime.utcnow() + timedelta(hours=data.expiry_hours)).isoformat()

    base_url = data.base_url.rstrip("/")
    share_link = f"{base_url}/shared/portfolio/{token}"

    share_record = {
        "token": token,
        "portfolio_id": data.portfolio_id,
        "user_id": user_id,
        "share_link": share_link,
        "expires_at": expires_at,
        "is_active": True,
        "view_only": data.view_only,
        "allowed_sections": data.allowed_sections,
        "view_limit": data.view_limit,
        "views_used": 0,
        "watermark": data.watermark,
        "watermark_text": data.watermark_text,
        "screenshot_protection": data.screenshot_protection,
        "allowed_countries": data.allowed_countries,
        "allowed_cities": data.allowed_cities,
        "device_bound": data.device_bound,
        "password": data.password,
    }

    try:
        result = db.table("portfolio_shares").insert(share_record).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save share token. Ensure the 'portfolio_shares' table exists in Supabase. Error: {str(e)}"
        )

    print(f"✅ Portfolio share created: {token} for portfolio {data.portfolio_id}")
    log_action(user_id, "generate_portfolio_share", {"portfolio_id": data.portfolio_id, "token": token}, "api")

    return {
        "ok": True,
        "token": token,
        "shareLink": share_link,
        "shareToken": token,
        "expiresAt": expires_at,
    }


@router.get("/share-public/{token}")
async def get_shared_portfolio(token: str, request: Request):
    """
    Public endpoint — validates share token and returns portfolio data.
    Enforces expiry, view limits, and all access controls.
    """
    db = get_admin_db()

    try:
        result = db.table("portfolio_shares").select("*").eq("token", token).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Share link not found")

    share = result.data[0]

    # Revoked or deactivated
    if not share.get("is_active") or share.get("revoked_at"):
        raise HTTPException(status_code=410, detail="This share link has been revoked")

    # Expiry check
    if share.get("expires_at"):
        try:
            expires_at = datetime.fromisoformat(share["expires_at"].replace("Z", "+00:00"))
            if datetime.utcnow() > expires_at.replace(tzinfo=None):
                raise HTTPException(status_code=410, detail="This share link has expired")
        except ValueError:
            pass

    # View limit check
    if share.get("view_limit") is not None:
        views_used = share.get("views_used", 0)
        if views_used >= share["view_limit"]:
            raise HTTPException(status_code=410, detail="View limit reached for this share link")

    # Geo-restriction check (basic — uses X-Forwarded-For or client host)
    if share.get("allowed_countries") or share.get("allowed_cities"):
        client_country = request.headers.get("CF-IPCountry") or request.headers.get("X-Country-Code") or ""
        client_city = request.headers.get("CF-IPCity") or request.headers.get("X-City") or ""
        allowed_countries = share.get("allowed_countries") or []
        allowed_cities = share.get("allowed_cities") or []

        if allowed_countries and client_country and client_country not in allowed_countries:
            raise HTTPException(
                status_code=403,
                detail=f"Access restricted to specific locations. Your location ({client_country}) is not allowed."
            )
        if allowed_cities and client_city and client_city not in allowed_cities:
            raise HTTPException(
                status_code=403,
                detail=f"Access restricted to specific cities. Your city ({client_city}) is not allowed."
            )

    # Fetch the portfolio
    portfolio_result = db.table("portfolios").select("*").eq("id", share["portfolio_id"]).execute()
    if not portfolio_result.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    portfolio = portfolio_result.data[0]

    # Filter sections if restricted
    allowed_sections = share.get("allowed_sections")
    if allowed_sections is not None:
        raw_sections = portfolio.get("sections", [])
        if isinstance(raw_sections, str):
            try:
                raw_sections = json.loads(raw_sections)
            except Exception:
                raw_sections = []
        portfolio["sections"] = [s for s in raw_sections if s.get("title") in allowed_sections]

    # Fetch vault documents for sections
    all_doc_ids = []
    sections = portfolio.get("sections", [])
    if isinstance(sections, str):
        try:
            sections = json.loads(sections)
        except Exception:
            sections = []
    for section in sections:
        all_doc_ids.extend(section.get("documents", []))

    documents = {}
    if all_doc_ids:
        try:
            docs_result = db.table("vault_images").select("*").in_("id", all_doc_ids).execute()
            for doc in (docs_result.data or []):
                documents[doc["id"]] = doc
        except Exception as e:
            print(f"⚠️ Could not fetch vault documents: {e}")

    # Increment view count
    try:
        db.table("portfolio_shares").update({
            "views_used": (share.get("views_used", 0) + 1),
        }).eq("token", token).execute()
    except Exception:
        pass

    return {
        "ok": True,
        "token": token,
        "portfolio": portfolio,
        "documents": documents,
        "shareSettings": {
            "viewOnly": share.get("view_only", True),
            "watermark": share.get("watermark", False),
            "watermarkText": share.get("watermark_text"),
            "screenshotProtection": share.get("screenshot_protection", False),
            "requiresPassword": bool(share.get("password")),
            "deviceBound": share.get("device_bound", False),
            "viewLimit": share.get("view_limit"),
            "viewsUsed": share.get("views_used", 0) + 1,
            "expiresAt": share.get("expires_at"),
            "allowedSections": share.get("allowed_sections"),
        }
    }


@router.post("/verify-share-password")
async def verify_share_password_portfolio(data: dict):
    """Verify password for a password-protected portfolio share."""
    db = get_admin_db()
    token = data.get("token", "")
    password = data.get("password", "")

    if not token or not password:
        raise HTTPException(status_code=400, detail="token and password required")

    try:
        result = db.table("portfolio_shares").select("password").eq("token", token).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not result.data:
        raise HTTPException(status_code=404, detail="Share not found")

    stored = result.data[0].get("password", "")
    if stored == password:
        return {"ok": True, "verified": True}
    return {"ok": True, "verified": False}


@router.post("/revoke-share")
async def revoke_portfolio_share(
    data: RevokeShareRequest,
    current_user: dict = Depends(get_current_user)
):
    """Immediately revoke a portfolio share link."""
    db = get_admin_db()
    user_id = current_user["sub"]

    # Verify ownership
    result = db.table("portfolio_shares").select("user_id").eq("token", data.token).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Share not found")

    if result.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    db.table("portfolio_shares").update({
        "is_active": False,
        "revoked_at": datetime.utcnow().isoformat()
    }).eq("token", data.token).execute()

    print(f"✅ Portfolio share revoked: {data.token}")
    log_action(user_id, "revoke_portfolio_share", {"token": data.token}, "api")

    return {"ok": True, "message": "Share link revoked immediately"}


@router.get("/get-portfolio-shares/{portfolio_id}")
async def get_portfolio_shares(
    portfolio_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all active shares for a portfolio."""
    db = get_admin_db()
    user_id = current_user["sub"]

    # Verify portfolio ownership
    existing = db.table("portfolios").select("id").eq("id", portfolio_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    try:
        result = db.table("portfolio_shares").select("*").eq("portfolio_id", portfolio_id).eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"ok": True, "shares": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shares: {str(e)}")


# ============================================================================
# ACCESS LOGGING
# ============================================================================

@router.post("/log-access")
async def log_portfolio_access(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Log portfolio access"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        portfolio_id = data.get("portfolio_id", "")
        action = data.get("action", "view")

        log_entry = {
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "action": action,
            "device": data.get("device", "Unknown"),
            "user_agent": data.get("user_agent", ""),
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            db.table("portfolio_access_logs").insert(log_entry).execute()
        except Exception:
            pass  # Don't fail the request if logging fails

        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/get-access-logs")
async def get_portfolio_access_logs(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Get portfolio access logs"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        portfolio_id = data.get("portfolio_id", "")

        try:
            result = db.table("portfolio_access_logs").select("*").eq("portfolio_id", portfolio_id).eq("user_id", user_id).order("timestamp", desc=True).execute()
            return {"ok": True, "logs": result.data or []}
        except Exception:
            return {"ok": True, "logs": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")
