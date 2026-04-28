from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from datetime import datetime
from ..db.database import get_admin_db
from ..utils.auth_helpers import get_current_user, log_action
import json
import base64
import os
from pathlib import Path

router = APIRouter(tags=["Profile"])

# Profile section categories
PROFILE_CATEGORIES = {
    "personal": ["Resume", "ID Proof", "Passport", "Photo"],
    "academic": ["10th Marks", "12th Marks", "Semester Marksheet", "Degree Certificate"],
    "projects": ["Project Photos", "GitHub Link", "Prototype Video", "Final Report PDF"],
    "internships": ["Offer Letter", "Completion Certificate", "Work Proof Photos"],
    "certifications": ["Online Courses", "Workshops", "Hackathons"],
    "exams": ["NEET", "IELTS/Duolingo/PTE/TOEFL", "GRE/GMAT"],
    "financial": ["Bank Statements", "ITR's", "Affidavits"]
}


@router.post("/get-profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get user's complete profile data"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Fetch profile data from user_profiles table
        profile_data = db.table("user_profiles").select("*").eq("user_id", user_id).execute()
        
        if not profile_data.data:
            # Return empty profile structure if none exists
            return {
                "user_id": user_id,
                "profile": {
                    "personal": {},
                    "academic": {},
                    "projects": {},
                    "internships": {},
                    "certifications": {},
                    "exams": {},
                    "financial": {}
                }
            }
        
        profile = profile_data.data[0]
        return {
            "user_id": user_id,
            "profile": json.loads(profile.get("profile_data", "{}")) if profile.get("profile_data") else {
                "personal": {},
                "academic": {},
                "projects": {},
                "internships": {},
                "certifications": {},
                "exams": {},
                "financial": {}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")


@router.post("/save-profile-item")
async def save_profile_item(
    category: str = Form(...),
    item_name: str = Form(...),
    item_data: str = Form(...),
    file: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Save profile item (text, link, or file upload)
    
    Args:
        category: Profile category (personal, academic, projects, etc.)
        item_name: Name of the item (e.g., "Resume", "GitHub Link")
        item_data: Data (text, link, or base64 if file uploaded)
        file: Optional file upload
    """
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Validate category
        if category not in PROFILE_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        # Get current profile
        profile_data = db.table("user_profiles").select("profile_data").eq("user_id", user_id).execute()
        
        if profile_data.data:
            profile = json.loads(profile_data.data[0].get("profile_data", "{}"))
        else:
            profile = {
                "personal": {}, "academic": {}, "projects": {},
                "internships": {}, "certifications": {}, "exams": {}, "financial": {}
            }
        
        # Ensure category exists
        if category not in profile:
            profile[category] = {}
        
        # Save file if provided
        file_url = None
        if file:
            # Convert file to base64
            content = await file.read()
            file_base64 = base64.b64encode(content).decode()
            file_url = f"data:{file.content_type};base64,{file_base64}"
        
        # Save item
        profile[category][item_name] = {
            "value": item_data,
            "file_url": file_url,
            "created_at": datetime.utcnow().isoformat(),
            "file_name": file.filename if file else None,
            "file_type": file.content_type if file else None
        }
        
        # Upsert profile in database
        profile_json = json.dumps(profile)
        
        existing = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        
        if existing.data:
            # Update
            db.table("user_profiles").update({
                "profile_data": profile_json,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()
        else:
            # Insert
            db.table("user_profiles").insert({
                "user_id": user_id,
                "profile_data": profile_json,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
        
        log_action(user_id, "save_profile_item", {"category": category, "item": item_name}, "api")
        
        return {
            "ok": True,
            "message": f"✅ {item_name} saved successfully",
            "category": category
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save profile item: {str(e)}")


@router.post("/save-camera-capture")
async def save_camera_capture(
    category: str = Form(...),
    item_name: str = Form(...),
    image_base64: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Save camera capture image to profile
    
    Args:
        category: Profile category
        item_name: Name of item (e.g., "Photo", "ID Proof")
        image_base64: Base64 encoded image string
    """
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Validate category
        if category not in PROFILE_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        # Get current profile
        profile_data = db.table("user_profiles").select("profile_data").eq("user_id", user_id).execute()
        
        if profile_data.data:
            profile = json.loads(profile_data.data[0].get("profile_data", "{}"))
        else:
            profile = {
                "personal": {}, "academic": {}, "projects": {},
                "internships": {}, "certifications": {}, "exams": {}, "financial": {}
            }
        
        # Ensure category exists
        if category not in profile:
            profile[category] = {}
        
        # Save camera image
        profile[category][item_name] = {
            "value": "Camera Capture",
            "file_url": image_base64,  # Full base64 string
            "created_at": datetime.utcnow().isoformat(),
            "file_type": "image/jpeg",
            "source": "camera"
        }
        
        # Upsert profile
        profile_json = json.dumps(profile)
        
        existing = db.table("user_profiles").select("id").eq("user_id", user_id).execute()
        
        if existing.data:
            db.table("user_profiles").update({
                "profile_data": profile_json,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()
        else:
            db.table("user_profiles").insert({
                "user_id": user_id,
                "profile_data": profile_json,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
        
        log_action(user_id, "save_camera_capture", {"category": category, "item": item_name}, "api")
        
        return {
            "ok": True,
            "message": f"📸 {item_name} captured and saved",
            "category": category
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save camera capture: {str(e)}")


@router.post("/delete-profile-item")
async def delete_profile_item(
    category: str = Form(...),
    item_name: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Delete a profile item"""
    try:
        db = get_admin_db()
        user_id = current_user["sub"]
        
        # Validate category
        if category not in PROFILE_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        # Get current profile
        profile_data = db.table("user_profiles").select("profile_data").eq("user_id", user_id).execute()
        
        if not profile_data.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile = json.loads(profile_data.data[0].get("profile_data", "{}"))
        
        # Delete item
        if category in profile and item_name in profile[category]:
            del profile[category][item_name]
        
        # Update database
        profile_json = json.dumps(profile)
        db.table("user_profiles").update({
            "profile_data": profile_json,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("user_id", user_id).execute()
        
        log_action(user_id, "delete_profile_item", {"category": category, "item": item_name}, "api")
        
        return {
            "ok": True,
            "message": f"❌ {item_name} deleted successfully",
            "category": category
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete profile item: {str(e)}")


@router.get("/profile-categories")
async def get_profile_categories():
    """Get all available profile categories and items"""
    return {
        "categories": PROFILE_CATEGORIES
    }
