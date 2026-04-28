from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from ..db.database import get_admin_db
from ..utils.auth_helpers import get_current_user, log_action
import json

router = APIRouter(tags=["Portfolio"])


@router.post("/get-portfolios")
async def get_portfolios(current_user: dict = Depends(get_current_user)):
    """Get all portfolios for the current user"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Fetch portfolios from database
        portfolios = db.table("portfolios").select("*").eq("user_id", user_id).execute()
        
        if not portfolios.data:
            return {"portfolios": []}
        
        return {"portfolios": portfolios.data}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolios: {str(e)}")


@router.post("/create-portfolio")
async def create_portfolio(
    name: str,
    type: str,
    sections: str,  # JSON string of sections
    current_user: dict = Depends(get_current_user)
):
    """Create a new portfolio"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Validate portfolio type
        valid_types = ["academic", "placement", "masters", "personal", "professional"]
        if type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid portfolio type: {type}")
        
        # Parse sections
        try:
            sections_data = json.loads(sections)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid sections JSON")
        
        # Create portfolio
        portfolio = {
            "user_id": user_id,
            "name": name,
            "type": type,
            "sections": sections_data,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "views": 0,
            "unique_viewers": 0
        }
        
        result = db.table("portfolios").insert(portfolio).execute()
        
        log_action(user_id, "create_portfolio", {"name": name, "type": type}, "api")
        
        return {
            "ok": True,
            "portfolio": result.data[0] if result.data else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create portfolio: {str(e)}")


@router.post("/update-portfolio")
async def update_portfolio(
    portfolio_id: str,
    name: str = None,
    type: str = None,
    sections: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing portfolio"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Check if portfolio exists and belongs to user
        existing = db.table("portfolios").select("*").eq("id", portfolio_id).eq("user_id", user_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Build update data
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        
        if name:
            update_data["name"] = name
        if type:
            valid_types = ["academic", "placement", "masters", "personal", "professional"]
            if type not in valid_types:
                raise HTTPException(status_code=400, detail=f"Invalid portfolio type: {type}")
            update_data["type"] = type
        if sections:
            try:
                update_data["sections"] = json.loads(sections)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid sections JSON")
        
        # Update portfolio
        result = db.table("portfolios").update(update_data).eq("id", portfolio_id).eq("user_id", user_id).execute()
        
        log_action(user_id, "update_portfolio", {"portfolio_id": portfolio_id}, "api")
        
        return {
            "ok": True,
            "portfolio": result.data[0] if result.data else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update portfolio: {str(e)}")


@router.post("/delete-portfolio")
async def delete_portfolio(
    portfolio_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a portfolio"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Check if portfolio exists and belongs to user
        existing = db.table("portfolios").select("*").eq("id", portfolio_id).eq("user_id", user_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Delete portfolio
        db.table("portfolios").delete().eq("id", portfolio_id).eq("user_id", user_id).execute()
        
        log_action(user_id, "delete_portfolio", {"portfolio_id": portfolio_id}, "api")
        
        return {"ok": True, "message": "Portfolio deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete portfolio: {str(e)}")


@router.post("/increment-views")
async def increment_views(
    portfolio_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Increment portfolio view count"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Get current portfolio
        existing = db.table("portfolios").select("*").eq("id", portfolio_id).eq("user_id", user_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        portfolio = existing.data[0]
        current_views = portfolio.get("views", 0)
        current_viewers = portfolio.get("unique_viewers", 0)
        
        # Update view counts
        db.table("portfolios").update({
            "views": current_views + 1,
            "unique_viewers": current_viewers + 1
        }).eq("id", portfolio_id).eq("user_id", user_id).execute()
        
        return {"ok": True}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to increment views: {str(e)}")
