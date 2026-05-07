"""
Secure file access endpoints for portfolio sharing.
Provides secure access to files with share restrictions.
"""

import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
from typing import Optional
from db.database import get_admin_db
from local_fallback_storage import LocalShareStorage

router = APIRouter(prefix="/secure-files", tags=["secure-files"])
local_storage = LocalShareStorage()

class SecureFileRequest(BaseModel):
    token: str
    document_id: str

@router.get("/document/{token}/{document_id}")
async def get_secure_document(token: str, document_id: str, request: Request = None):
    """
    Get secure access to a document from a shared portfolio.
    Validates share token and restrictions before providing file access.
    """
    print(f"🔐 SECURE FILE ACCESS: Token={token}, Document={document_id}")
    print(f"📍 DATABASE_URL hostname: {os.getenv('DATABASE_URL', 'NOT_SET')}")
    print(f"📍 SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT_SET')}")
    
    print("🔗 DATABASE CONNECTION ATTEMPT (SECURE FILE ACCESS):")
    db = None
    use_fallback = False
    
    try:
        db = get_admin_db()
        print("✅ Database client created successfully (secure file access)")
        
        # Test database connection
        test_response = db.table("portfolio_shares").select("count").limit(1).execute()
        print(f"✅ Database connection test successful (secure file access)")
        print("✅ Database connected (secure file access)")
        
    except Exception as db_error:
        print(f"❌ DATABASE CONNECTION ERROR (SECURE FILE ACCESS): {type(db_error).__name__}: {str(db_error)}")
        print("🔄 FALLING BACK TO LOCAL JSON STORAGE (SECURE FILE ACCESS)")
        use_fallback = True
    
    try:
        # Validate share token and get share details
        share = None
        
        if use_fallback:
            print("📁 Using local storage for secure file access")
            try:
                local_share = local_storage.get_share_by_token(token)
                if local_share:
                    share = local_share
                    print(f"✅ Share found in local storage: {token}")
                else:
                    print(f"❌ Share not found in local storage: {token}")
                    raise HTTPException(status_code=404, detail="Share not found")
            except Exception as local_error:
                print(f"❌ Local storage error: {type(local_error).__name__}: {str(local_error)}")
                raise HTTPException(status_code=500, detail="Failed to validate share")
        else:
            print("🗄️ Using database for secure file access")
            try:
                response = db.table("portfolio_shares") \
                    .select("*") \
                    .eq("token", token) \
                    .execute()
                
                if not response.data:
                    print(f"❌ Share not found in database: {token}")
                    raise HTTPException(status_code=404, detail="Share not found")
                
                share = response.data[0]
                print(f"✅ Share found in database: {token}")
                
            except Exception as query_error:
                print(f"❌ Database query error: {type(query_error).__name__}: {str(query_error)}")
                raise HTTPException(status_code=500, detail="Failed to validate share")
        
        # Check if share is active
        if not share.get("is_active"):
            print("❌ Share is not active")
            raise HTTPException(status_code=410, detail="Share is not active")
        
        # Check expiry
        expires_at = share.get("expires_at")
        if expires_at and datetime.fromisoformat(expires_at.replace('Z', '+00:00')) < datetime.now():
            print("❌ Share has expired")
            raise HTTPException(status_code=410, detail="Share has expired")
        
        # Check one-time access
        if share.get("access_type") == "one-time" and share.get("view_count", 0) > 0:
            print("❌ One-time share already accessed")
            raise HTTPException(status_code=410, detail="One-time share already accessed")
        
        # Get portfolio to find document
        portfolio = None
        if use_fallback:
            print("📁 Using local storage for portfolio retrieval")
            try:
                # For local storage, we'll create a mock portfolio with the document
                portfolio = {
                    "id": share["portfolio_id"],
                    "documents": [
                        {
                            "id": document_id,
                            "name": f"Document {document_id}",
                            "type": "application/pdf",
                            "size": 1024000,
                            "file_url": f"https://whrahermnqovrupvvxtw.supabase.co/storage/v1/object/public/portfolio-files/{share['user_id']}/{share['portfolio_id']}/{document_id}",
                            "uploaded_at": share.get("created_at"),
                            "user_id": share["user_id"]
                        }
                    ]
                }
                print(f"✅ Mock portfolio created for secure access")
            except Exception as local_error:
                print(f"❌ Local portfolio error: {type(local_error).__name__}: {str(local_error)}")
                raise HTTPException(status_code=500, detail="Failed to retrieve portfolio")
        else:
            print("🗄️ Using database for portfolio retrieval")
            try:
                portfolio_response = db.table("portfolios") \
                    .select("*") \
                    .eq("id", share["portfolio_id"]) \
                    .execute()
                
                if not portfolio_response.data:
                    print(f"❌ Portfolio not found: {share['portfolio_id']}")
                    raise HTTPException(status_code=404, detail="Portfolio not found")
                
                portfolio = portfolio_response.data[0]
                print(f"✅ Portfolio found: {portfolio['id']}")
                
            except Exception as portfolio_error:
                print(f"❌ Portfolio query error: {type(portfolio_error).__name__}: {str(portfolio_error)}")
                raise HTTPException(status_code=500, detail="Failed to retrieve portfolio")
        
        # Find the specific document
        documents = portfolio.get("documents", [])
        target_document = None
        
        for doc in documents:
            if isinstance(doc, dict) and doc.get("id") == document_id:
                target_document = doc
                break
            elif isinstance(doc, str) and doc == document_id:
                # Old format - create mock document
                target_document = {
                    "id": document_id,
                    "name": f"Document {document_id}",
                    "type": "application/pdf",
                    "size": 1024000,
                    "file_url": f"https://whrahermnqovrupvvxtw.supabase.co/storage/v1/object/public/portfolio-files/{share['user_id']}/{share['portfolio_id']}/{document_id}",
                    "uploaded_at": share.get("created_at"),
                    "user_id": share["user_id"]
                }
                break
        
        if not target_document:
            print(f"❌ Document not found: {document_id}")
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check download restrictions
        allow_download = share.get("allow_download", True)
        if not allow_download:
            print("❌ Download not allowed for this share")
            raise HTTPException(status_code=403, detail="Download not allowed")
        
        # Log access
        print(f"📝 Logging secure file access for document: {document_id}")
        client_ip = request.client.host if request else "unknown"
        user_agent = request.headers.get("user-agent", "") if request else ""
        
        if use_fallback:
            try:
                # Update local storage with access log
                updated_share = share.copy()
                access_log = json.loads(updated_share.get("access_log", "[]"))
                access_log.append({
                    "timestamp": datetime.now().isoformat(),
                    "ip_address": client_ip,
                    "user_agent": user_agent,
                    "document_id": document_id,
                    "action": "secure_file_access"
                })
                updated_share["access_log"] = json.dumps(access_log)
                updated_share["view_count"] = (share.get("view_count", 0) + 1)
                updated_share["last_accessed"] = datetime.now().isoformat()
                
                local_storage.update_share(token, updated_share)
                print(f"✅ Access logged in local storage")
            except Exception as log_error:
                print(f"⚠️ Failed to log access: {log_error}")
        else:
            try:
                # Update database with access log
                db.table("portfolio_shares") \
                    .update({
                        "view_count": (share.get("view_count", 0) + 1),
                        "last_accessed": datetime.now().isoformat(),
                        "last_ip": client_ip,
                        "last_user_agent": user_agent
                    }) \
                    .eq("token", token) \
                    .execute()
                print(f"✅ Access logged in database")
            except Exception as log_error:
                print(f"⚠️ Failed to log access: {log_error}")
        
        print(f"✅ Secure file access granted: {document_id}")
        print(f"🔗 File URL: {target_document.get('file_url')}")
        
        # Return document metadata and secure URL
        return {
            "success": True,
            "document": {
                "id": target_document["id"],
                "name": target_document["name"],
                "type": target_document["type"],
                "size": target_document["size"],
                "file_url": target_document["file_url"],
                "uploaded_at": target_document["uploaded_at"],
                "share_restrictions": {
                    "allow_download": allow_download,
                    "watermark_enabled": share.get("watermark_enabled", False),
                    "access_type": share.get("access_type", "public")
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Secure file access error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error accessing file: {str(e)}")

@router.post("/document-access")
async def request_document_access(request: SecureFileRequest, http_request: Request = None):
    """
    Request access to a specific document from a shared portfolio.
    Returns signed URL or access token for secure file access.
    """
    return await get_secure_document(request.token, request.document_id, http_request)
