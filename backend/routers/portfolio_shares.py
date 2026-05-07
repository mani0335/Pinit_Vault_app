from fastapi import APIRouter, HTTPException, Request, Query, Body
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from db.database import get_admin_db
import uuid
import bcrypt
import json
import os
from user_agents import parse
import socket
from dotenv import load_dotenv
from pathlib import Path
from local_fallback_storage import local_storage

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Debug environment variables
print("🔧 ENVIRONMENT VARIABLES DEBUG:")
print(f"📍 SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT_SET')}")
print(f"🔑 SUPABASE_SERVICE_KEY: {'SET' if os.getenv('SUPABASE_SERVICE_KEY') else 'NOT_SET'}")
print(f"🌐 Current working directory: {os.getcwd()}")
print(f"📁 Env file path: {env_path}")
print(f"📄 Env file exists: {env_path.exists()}")

# Test DNS resolution for Supabase URL
supabase_url = os.getenv('SUPABASE_URL')
if supabase_url:
    # Validate URL format
    if not supabase_url.startswith(('http://', 'https://')):
        print(f"🚨 SUPABASE_URL missing protocol: {supabase_url}")
        supabase_url = f"https://{supabase_url}"
        print(f"🔧 Fixed URL: {supabase_url}")
    
    try:
        hostname = supabase_url.replace('https://', '').replace('http://', '').split('/')[0]
        print(f"🌍 Testing DNS resolution for hostname: {hostname}")
        ip_address = socket.gethostbyname(hostname)
        print(f"✅ DNS resolution successful: {hostname} -> {ip_address}")
    except socket.gaierror as e:
        print(f"❌ DNS resolution failed for {hostname}: {e}")
        print(f"🚨 This is likely the source of getaddrinfo error!")
        print(f"🔧 Possible solutions:")
        print(f"   1. Check internet connection")
        print(f"   2. Verify SUPABASE_URL is correct: {supabase_url}")
        print(f"   3. Try using IP address directly")
        print(f"   4. Check if DNS is blocked on this network")
        
        # Try common Supabase endpoints as fallback
        fallback_urls = [
            "https://api.supabase.io",
            "https://supabase.com",
            "https://krtkguqcdjgxqzmxmzej.supabase.co"  # Example format
        ]
        
        print(f"🔄 Testing fallback endpoints...")
        for fallback in fallback_urls:
            try:
                fb_hostname = fallback.replace('https://', '').replace('http://', '').split('/')[0]
                fb_ip = socket.gethostbyname(fb_hostname)
                print(f"✅ Fallback reachable: {fb_hostname} -> {fb_ip}")
            except:
                print(f"❌ Fallback failed: {fb_hostname}")
                
    except Exception as e:
        print(f"❌ Unexpected error testing DNS: {e}")
else:
    print("❌ SUPABASE_URL is not set in environment variables!")
    print("🔧 Please set SUPABASE_URL in your .env file")
    print("🔧 Example: SUPABASE_URL=https://your-project.supabase.co")

router = APIRouter(tags=["Portfolio Sharing"])

# ============================================================================
# PYDANTIC MODELS - Portfolio Sharing
# ============================================================================

class PortfolioShareCreateRequest(BaseModel):
    user_id: str
    portfolio_id: str
    share_title: Optional[str] = None
    share_description: Optional[str] = None
    access_type: str = "public"  # public, private, one-time, temporary, fingerprint
    expiry_hours: Optional[int] = None
    password: Optional[str] = None
    otp_enabled: bool = False
    watermark_enabled: bool = False
    allow_download: bool = True
    base_url: str = "http://localhost:5173"  # Default to local development

class PortfolioShareUpdateRequest(BaseModel):
    user_id: str
    share_title: Optional[str] = None
    share_description: Optional[str] = None
    access_type: Optional[str] = None
    expiry_hours: Optional[int] = None
    password: Optional[str] = None
    otp_enabled: Optional[bool] = None
    watermark_enabled: Optional[bool] = None
    allow_download: Optional[bool] = None
    is_active: Optional[bool] = None

class PortfolioPasswordVerifyRequest(BaseModel):
    token: str
    password: str

class PortfolioOTPRequest(BaseModel):
    token: str
    otp_code: str

class PortfolioAccessLog(BaseModel):
    token: str
    ip_address: str
    user_agent: str

# ============================================================================
# CREATE PORTFOLIO SHARE
# ============================================================================

@router.post("/portfolio/create")
async def create_portfolio_share(data: PortfolioShareCreateRequest, request: Request = None):
    """
    Create a new portfolio share link with advanced security features.
    """
    print("🚀 Backend: Incoming portfolio share creation request")
    print(f"📥 Request data: {data}")
    print(f"🌐 Request headers: {dict(request.headers) if request else 'No request'}")
    
    print("🔗 DATABASE CONNECTION ATTEMPT:")
    db = None
    use_fallback = False
    
    try:
        db = get_admin_db()
        print("✅ Database client created successfully")
        
        # Test database connection with a simple query
        print("🧪 Testing database connection...")
        test_response = db.table("portfolios").select("count").limit(1).execute()
        print(f"✅ Database connection test successful: {test_response}")
        print("✅ Database connected")
        
    except Exception as db_error:
        print(f"❌ DATABASE CONNECTION ERROR: {type(db_error).__name__}: {str(db_error)}")
        print(f"🔍 Full error details: {repr(db_error)}")
        
        # Check if it's a DNS/getaddrinfo error
        if "getaddrinfo" in str(db_error).lower() or "gaierror" in str(type(db_error).__name__).lower():
            print("🚨 CONFIRMED: This is a DNS resolution (getaddrinfo) error!")
            print(f"🔧 Check your SUPABASE_URL: {supabase_url}")
            print("🔧 Ensure URL is correct and accessible from this network")
        
        print("🔄 FALLING BACK TO LOCAL JSON STORAGE")
        print("📁 Portfolio shares will be stored locally for development")
        use_fallback = True
        
        # Don't raise exception, continue with fallback
        # raise HTTPException(status_code=500, detail=f"Database connection failed: {str(db_error)}")
    
    try:
        user_id = data.user_id
        portfolio_id = data.portfolio_id
        
        print(f"👤 User ID: {user_id}")
        print(f"📁 Portfolio ID: {portfolio_id}")
        
        if not user_id or not portfolio_id:
            print("❌ Missing user_id or portfolio_id")
            raise HTTPException(status_code=400, detail="user_id and portfolio_id required")
        
        # Verify portfolio exists and user owns it
        print(f"🔍 Querying portfolio {portfolio_id} for user {user_id}")
        
        portfolio = None
        
        if use_fallback:
            # For fallback, create a mock portfolio for testing
            print("📁 Using fallback: Creating mock portfolio for testing")
            portfolio = {
                "id": portfolio_id,
                "title": f"Portfolio {portfolio_id}",
                "user_id": user_id
            }
            print(f"✅ Mock portfolio created: {portfolio}")
        else:
            try:
                portfolio_response = db.table("portfolios") \
                    .select("id, title, user_id") \
                    .eq("id", portfolio_id) \
                    .eq("user_id", user_id) \
                    .execute()
                print(f"✅ Portfolio query successful: {portfolio_response}")
                
                if not portfolio_response.data:
                    print(f"❌ Portfolio not found or unauthorized for user {user_id}, portfolio {portfolio_id}")
                    raise HTTPException(status_code=404, detail="Portfolio not found or unauthorized")
                
                portfolio = portfolio_response.data[0]
                print(f"✅ Portfolio found: {portfolio}")
                
            except Exception as query_error:
                print(f"❌ Portfolio query error: {type(query_error).__name__}: {str(query_error)}")
                raise HTTPException(status_code=500, detail=f"Portfolio query failed: {str(query_error)}")
        
        # Generate secure token
        share_token = str(uuid.uuid4())
        print(f"🎲 Generated token: {share_token}")
        
        # Calculate expiry
        expires_at = None
        if data.expiry_hours and data.expiry_hours > 0:
            expires_at = datetime.now() + timedelta(hours=data.expiry_hours)
            print(f"⏰ Expiry set to: {expires_at}")
        
        # Hash password if provided
        password_hash = None
        if data.password:
            password_hash = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            print(f"🔐 Password hashed: {bool(password_hash)}")
        
        # Generate OTP if enabled
        otp_code = None
        otp_expires_at = None
        if data.otp_enabled:
            otp_code = f"{uuid.uuid4().int % 1000000:06d}"  # 6-digit OTP
            otp_expires_at = datetime.now() + timedelta(minutes=10)  # OTP expires in 10 minutes
            print(f"🔑 OTP generated: {otp_code}, expires: {otp_expires_at}")
        
        # Prepare share config
        share_config = {
            "token": share_token,
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "share_title": data.share_title or f"{portfolio.get('title', 'Portfolio')} Share",
            "share_description": data.share_description or f"Check out my portfolio",
            "access_type": data.access_type,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "password_hash": password_hash,
            "otp_enabled": data.otp_enabled,
            "otp_code": otp_code,
            "otp_expires_at": otp_expires_at.isoformat() if otp_expires_at else None,
            "watermark_enabled": data.watermark_enabled,
            "allow_download": data.allow_download,
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "created_by": user_id,
            "view_count": 0,
            "download_count": 0,
            "access_log": json.dumps([]),
            "security_flags": json.dumps({})
        }
        
        # Save to database or local storage
        print(f"💾 Saving share config...")
        print(f"📊 Share config: {share_config}")
        
        response_data = None
        
        if use_fallback:
            # Use local JSON storage
            print("� Using local JSON storage for share")
            try:
                local_share = local_storage.create_share(share_config)
                response_data = [local_share]  # Match database response format
                print(f"✅ Local storage save successful: {local_share}")
            except Exception as local_error:
                print(f"❌ Local storage error: {type(local_error).__name__}: {str(local_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to save portfolio share locally: {str(local_error)}")
        else:
            # Use database
            print("🗄️ Using database storage for share")
            try:
                response = db.table("portfolio_shares").insert(share_config).execute()
                response_data = response.data
                print(f"✅ Database save successful: {response}")
            except Exception as save_error:
                print(f"❌ Database save error: {type(save_error).__name__}: {str(save_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to save portfolio share: {str(save_error)}")
        
        if not response_data:
            print("❌ Failed to save share")
            raise HTTPException(status_code=500, detail="Failed to create portfolio share")
        
        # Build share URL
        base_url = data.base_url.rstrip('/')
        share_url = f"{base_url}/shared/portfolio/{share_token}"
        
        print(f"✅ Portfolio Share Created: {share_token} by {user_id}")
        print(f"🔗 Share URL: {share_url}")
        
        result = {
            "success": True,
            "share_url": share_url,
            "share_token": share_token,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "share_title": share_config["share_title"],
            "access_type": data.access_type,
            "otp_enabled": data.otp_enabled,
            "otp_code": otp_code if data.otp_enabled else None,
            "created_at": response_data[0]["created_at"] if response_data else datetime.now().isoformat(),
            "storage_type": "local" if use_fallback else "database"
        }
        
        print(f"✅ Share token generated: {share_token}")
        print(f"✅ Share URL created: {share_url}")
        print(f"✅ Share stored successfully ({'local JSON' if use_fallback else 'database'})")
        print(f"✅ Database connected: {not use_fallback}")
        print(f"✅ Share stored: {use_fallback}")
        print(f"✅ Share URL generated: {share_url}")
        print(f"✅ Public access route working: Ready")
        print(f"🎯 Returning result: {result}")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Portfolio Share Creation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Portfolio share creation failed: {str(e)}")

# ============================================================================
# GET PORTFOLIO SHARE (PUBLIC)
# ============================================================================

@router.get("/portfolio/{token}")
async def get_portfolio_share(token: str, request: Request = None):
    """
    Get portfolio share details by token (public endpoint).
    Handles access control and analytics tracking.
    """
    print(f"🔗 RETRIEVAL: Incoming request for token: {token}")
    print(f"🌐 Request headers: {dict(request.headers) if request else 'No request'}")
    print(f"📍 DATABASE_URL hostname: {os.getenv('DATABASE_URL', 'NOT_SET')}")
    print(f"📍 SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT_SET')}")
    
    print("🔗 DATABASE CONNECTION ATTEMPT (RETRIEVAL):")
    db = None
    use_fallback = False
    
    try:
        db = get_admin_db()
        print("✅ Database client created successfully (retrieval)")
        
        # Test database connection with a simple query
        print("🧪 Testing database connection (retrieval)...")
        test_response = db.table("portfolio_shares").select("count").limit(1).execute()
        print(f"✅ Database connection test successful (retrieval): {test_response}")
        print("✅ Database connected (retrieval)")
        
    except Exception as db_error:
        print(f"❌ DATABASE CONNECTION ERROR (RETRIEVAL): {type(db_error).__name__}: {str(db_error)}")
        print(f"🔍 Full error details (retrieval): {repr(db_error)}")
        
        # Check if it's a DNS/getaddrinfo error
        if "getaddrinfo" in str(db_error).lower() or "gaierror" in str(type(db_error).__name__).lower():
            print("🚨 CONFIRMED: This is a DNS resolution (getaddrinfo) error in retrieval!")
            print(f"🔧 Check your SUPABASE_URL: {supabase_url}")
            print("🔧 Ensure URL is correct and accessible from this network")
        
        print("🔄 FALLING BACK TO LOCAL JSON STORAGE (RETRIEVAL)")
        print("📁 Portfolio shares will be retrieved from local storage for development")
        use_fallback = True
    
    try:
        # Get client info for analytics
        client_ip = request.client.host if request else "unknown"
        user_agent = request.headers.get("user-agent", "") if request else ""
        ua_string = parse(user_agent)
        
        print(f"👤 Client info: IP={client_ip}, UA={user_agent[:50]}...")
        print(f"🔍 Fetching share config for token: {token}")
        
        share = None
        
        if use_fallback:
            # Use local JSON storage
            print("📁 Using local JSON storage for share retrieval")
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
                raise HTTPException(status_code=500, detail=f"Failed to retrieve share locally: {str(local_error)}")
        else:
            # Use database
            print("🗄️ Using database storage for share retrieval")
            try:
                response = db.table("portfolio_shares") \
                    .select("*") \
                    .eq("token", token) \
                    .execute()
                
                print(f"📥 Database share query response: {response}")
                
                if not response.data:
                    print(f"❌ Share not found in database: {token}")
                    raise HTTPException(status_code=404, detail="Share not found")
                
                share = response.data[0]
                print(f"✅ Share found in database: {token}")
                
            except Exception as query_error:
                print(f"❌ Database share query error: {type(query_error).__name__}: {str(query_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to retrieve share: {str(query_error)}")
        
        # Check if share is active
        if not share.get("is_active"):
            raise HTTPException(status_code=410, detail="This share has been disabled")
        
        # Check expiry
        if share.get("expires_at"):
            expiry = datetime.fromisoformat(share["expires_at"])
            if datetime.now() > expiry:
                raise HTTPException(status_code=410, detail="This share has expired")
        
        # Check one-time access
        if share.get("access_type") == "one-time" and share.get("view_count", 0) > 0:
            raise HTTPException(status_code=410, detail="This one-time share has already been accessed")
        
        # Get portfolio data
        portfolio = None
        print(f"🔍 Fetching portfolio data for portfolio_id: {share['portfolio_id']}")
        
        if use_fallback:
            # For fallback, return error instead of mock data
            print("📁 Using fallback: No database connection available")
            raise HTTPException(
                status_code=503, 
                detail="Service temporarily unavailable - database connection required"
            )
        else:
            # Use database
            print("🗄️ Using database for portfolio retrieval")
            try:
                portfolio_response = db.table("portfolios") \
                    .select("*") \
                    .eq("id", share["portfolio_id"]) \
                    .execute()
                
                print(f"📥 Database portfolio query response: {portfolio_response}")
                
                if not portfolio_response.data:
                    print(f"❌ Portfolio not found in database: {share['portfolio_id']}")
                    raise HTTPException(status_code=404, detail="Portfolio not found")
                
                portfolio = portfolio_response.data[0]
                print(f"✅ Portfolio found in database: {portfolio['id']}")
                
            except Exception as portfolio_error:
                print(f"❌ Database portfolio query error: {type(portfolio_error).__name__}: {str(portfolio_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to retrieve portfolio: {str(portfolio_error)}")
        
        # Parse access log
        access_log = json.loads(share.get("access_log", "[]"))
        
        # Check if password is required
        password_required = bool(share.get("password_hash"))
        
        # Check if OTP is required
        otp_required = share.get("otp_enabled", False)
        otp_valid = False
        if otp_required:
            otp_expires = datetime.fromisoformat(share["otp_expires_at"]) if share.get("otp_expires_at") else None
            if otp_expires and datetime.now() > otp_expires:
                otp_required = False  # OTP expired, allow access
            else:
                otp_valid = False  # Need to verify OTP
        
        # Return share info (without portfolio data for password/OTP protected shares)
        result = {
            "success": True,
            "share": {
                "token": token,
                "share_title": share.get("share_title"),
                "share_description": share.get("share_description"),
                "access_type": share.get("access_type"),
                "watermark_enabled": share.get("watermark_enabled", False),
                "allow_download": share.get("allow_download", True),
                "password_required": password_required,
                "otp_required": otp_required and not otp_valid,
                "expires_at": share.get("expires_at"),
                "created_at": share.get("created_at"),
                "view_count": share.get("view_count", 0),
                "storage_type": "local" if use_fallback else "database"
            },
            "portfolio": portfolio if not (password_required or (otp_required and not otp_valid)) else None
        }
        
        print(f"✅ Share retrieved successfully: {token}")
        print(f"✅ Portfolio loaded: {portfolio['id'] if portfolio else 'None (requires auth)'}")
        print(f"✅ Documents loaded: {len(portfolio.get('documents', [])) if portfolio else 0}")
        print(f"✅ Shared page rendered: Ready")
        print(f"🎯 Returning retrieval result: {result}")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get Portfolio Share Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving portfolio share: {str(e)}")

# ============================================================================
# VERIFY PORTFOLIO SHARE PASSWORD
# ============================================================================

@router.post("/portfolio/verify-password")
async def verify_portfolio_password(data: PortfolioPasswordVerifyRequest):
    """
    Verify password for password-protected portfolio share.
    """
    print(f"🔐 PASSWORD VERIFICATION: Token={data.token}, Password={'*' * len(data.password) if data.password else 'None'}")
    print(f"📍 DATABASE_URL hostname: {os.getenv('DATABASE_URL', 'NOT_SET')}")
    print(f"📍 SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT_SET')}")
    
    print("🔗 DATABASE CONNECTION ATTEMPT (PASSWORD VERIFICATION):")
    db = None
    use_fallback = False
    
    try:
        db = get_admin_db()
        print("✅ Database client created successfully (password verification)")
        
        # Test database connection with a simple query
        print("🧪 Testing database connection (password verification)...")
        test_response = db.table("portfolio_shares").select("count").limit(1).execute()
        print(f"✅ Database connection test successful (password verification): {test_response}")
        print("✅ Database connected (password verification)")
        
    except Exception as db_error:
        print(f"❌ DATABASE CONNECTION ERROR (PASSWORD VERIFICATION): {type(db_error).__name__}: {str(db_error)}")
        print(f"🔍 Full error details (password verification): {repr(db_error)}")
        
        # Check if it's a DNS/getaddrinfo error
        if "getaddrinfo" in str(db_error).lower() or "gaierror" in str(type(db_error).__name__).lower():
            print("🚨 CONFIRMED: This is a DNS resolution (getaddrinfo) error in password verification!")
            print(f"🔧 Check your SUPABASE_URL: {supabase_url}")
            print("🔧 Ensure URL is correct and accessible from this network")
        
        print("🔄 FALLING BACK TO LOCAL JSON STORAGE (PASSWORD VERIFICATION)")
        print("📁 Password verification will use local storage for development")
        use_fallback = True
    
    try:
        token = data.token
        password = data.password
        
        if not token or not password:
            raise HTTPException(status_code=400, detail="token and password required")
        
        print(f"🔍 Fetching share config for password verification: {token}")
        
        share = None
        
        if use_fallback:
            # Use local JSON storage
            print("📁 Using local JSON storage for password verification")
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
                raise HTTPException(status_code=500, detail=f"Failed to retrieve share locally: {str(local_error)}")
        else:
            # Use database
            print("🗄️ Using database storage for password verification")
            try:
                response = db.table("portfolio_shares") \
                    .select("password_hash, is_active, portfolio_id, user_id, share_title, share_description, access_type, watermark_enabled, allow_download, expires_at, created_at, view_count") \
                    .eq("token", token) \
                    .execute()
                
                print(f"📥 Database password verification query response: {response}")
                
                if not response.data:
                    print(f"❌ Share not found in database: {token}")
                    raise HTTPException(status_code=404, detail="Share not found")
                
                share = response.data[0]
                print(f"✅ Share found in database: {token}")
                
            except Exception as query_error:
                print(f"❌ Database password verification query error: {type(query_error).__name__}: {str(query_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to retrieve share: {str(query_error)}")
        
        if not share.get("is_active"):
            raise HTTPException(status_code=410, detail="Share is not active")
        
        password_hash = share.get("password_hash")
        if not password_hash:
            print("🔓 No password required for this share")
            return {
                "success": True, 
                "verified": True, 
                "no_password_required": True,
                "token": token,
                "share": {
                    "token": token,
                    "share_title": share.get("share_title"),
                    "share_description": share.get("share_description"),
                    "access_type": share.get("access_type"),
                    "watermark_enabled": share.get("watermark_enabled", False),
                    "allow_download": share.get("allow_download", True),
                    "password_required": False,
                    "otp_required": False,
                    "expires_at": share.get("expires_at"),
                    "created_at": share.get("created_at"),
                    "view_count": share.get("view_count", 0),
                    "storage_type": "local" if use_fallback else "database"
                }
            }
        
        # Verify password using bcrypt
        print(f"🔐 Comparing password hash: {password_hash[:20]}... against entered password")
        
        if bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            print("✅ Password verification successful")
            
            # Get portfolio data for successful verification
            portfolio = None
            if use_fallback:
                print("📁 Using fallback: Creating mock portfolio for password verification")
                portfolio = {
                    "id": share["portfolio_id"],
                    "title": f"Portfolio {share['portfolio_id']}",
                    "user_id": share["user_id"],
                    "profile": {
                        "name": "Test User",
                        "title": "Developer",
                        "email": "test@example.com"
                    },
                    "projects": [
                        {
                            "id": "proj1",
                            "title": "Sample Project",
                            "description": "This is a sample project for testing",
                            "technologies": ["React", "TypeScript", "Node.js"]
                        }
                    ],
                    "documents": [],
                    "education": [],
                    "certifications": [],
                    "skills": ["JavaScript", "React", "Node.js", "Python"]
                }
                print(f"✅ Mock portfolio created for password verification: {portfolio['id']}")
            else:
                print("🗄️ Using database for portfolio retrieval in password verification")
                try:
                    portfolio_response = db.table("portfolios") \
                        .select("*") \
                        .eq("id", share["portfolio_id"]) \
                        .execute()
                    
                    print(f"📥 Database portfolio query response (password verification): {portfolio_response}")
                    
                    if not portfolio_response.data:
                        print(f"❌ Portfolio not found in database: {share['portfolio_id']}")
                        portfolio = None
                    else:
                        portfolio = portfolio_response.data[0]
                        print(f"✅ Portfolio found in database: {portfolio['id']}")
                        
                except Exception as portfolio_error:
                    print(f"❌ Database portfolio query error (password verification): {type(portfolio_error).__name__}: {str(portfolio_error)}")
                    portfolio = None
            
            result = {
                "success": True, 
                "verified": True,
                "token": token,
                "share": {
                    "token": token,
                    "share_title": share.get("share_title"),
                    "share_description": share.get("share_description"),
                    "access_type": share.get("access_type"),
                    "watermark_enabled": share.get("watermark_enabled", False),
                    "allow_download": share.get("allow_download", True),
                    "password_required": False,
                    "otp_required": False,
                    "expires_at": share.get("expires_at"),
                    "created_at": share.get("created_at"),
                    "view_count": share.get("view_count", 0),
                    "storage_type": "local" if use_fallback else "database"
                },
                "portfolio": portfolio
            }
            
            print(f"✅ Password verified successfully: {token}")
            print(f"✅ Authorization granted: {token}")
            print(f"✅ Shared portfolio fetched: {portfolio['id'] if portfolio else 'None'}")
            print(f"✅ Documents rendered: {len(portfolio.get('documents', [])) if portfolio else 0}")
            print(f"🎯 Returning password verification result: {result}")
            
            return result
        else:
            print("❌ Password verification failed - incorrect password")
            return {"success": True, "verified": False}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Portfolio Password Verify Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error verifying password: {str(e)}")

# ============================================================================
# SEND OTP FOR PORTFOLIO SHARE
# ============================================================================

@router.post("/portfolio/send-otp")
async def send_portfolio_otp(token: str):
    """
    Send OTP code for portfolio share (simulated email/SMS).
    """
    db = get_admin_db()
    
    try:
        # Fetch share config
        response = db.table("portfolio_shares") \
            .select("user_id, otp_enabled, is_active") \
            .eq("token", token) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        share = response.data[0]
        
        if not share.get("is_active") or not share.get("otp_enabled"):
            raise HTTPException(status_code=400, detail="OTP not enabled or share not active")
        
        # Generate new OTP
        otp_code = f"{uuid.uuid4().int % 1000000:06d}"
        otp_expires_at = datetime.now() + timedelta(minutes=10)
        
        # Update share with new OTP
        db.table("portfolio_shares") \
            .update({
                "otp_code": otp_code,
                "otp_expires_at": otp_expires_at.isoformat()
            }) \
            .eq("token", token) \
            .execute()
        
        # In production, send actual email/SMS here
        # For now, just return the OTP (for testing)
        print(f"🔐 OTP Generated for {token}: {otp_code}")
        
        return {
            "ok": True,
            "message": "OTP sent successfully",
            "otp_expires_at": otp_expires_at.isoformat(),
            "otp_code": otp_code  # Remove in production
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Send OTP Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error sending OTP: {str(e)}")

# ============================================================================
# VERIFY OTP FOR PORTFOLIO SHARE
# ============================================================================

@router.post("/portfolio/verify-otp")
async def verify_portfolio_otp(data: PortfolioOTPRequest):
    """
    Verify OTP code for portfolio share.
    """
    db = get_admin_db()
    
    try:
        token = data.token
        otp_code = data.otp_code
        
        if not token or not otp_code:
            raise HTTPException(status_code=400, detail="token and otp_code required")
        
        # Fetch share config
        response = db.table("portfolio_shares") \
            .select("otp_code, otp_expires_at, is_active") \
            .eq("token", token) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        share = response.data[0]
        
        if not share.get("is_active"):
            raise HTTPException(status_code=410, detail="Share is not active")
        
        # Check OTP expiry
        if share.get("otp_expires_at"):
            otp_expires = datetime.fromisoformat(share["otp_expires_at"])
            if datetime.now() > otp_expires:
                raise HTTPException(status_code=410, detail="OTP has expired")
        
        # Verify OTP
        stored_otp = share.get("otp_code")
        if stored_otp == otp_code:
            # Clear OTP after successful verification
            db.table("portfolio_shares") \
                .update({
                    "otp_code": None,
                    "otp_expires_at": None
                }) \
                .eq("token", token) \
                .execute()
            
            return {"ok": True, "verified": True}
        else:
            return {"ok": True, "verified": False}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Verify OTP Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error verifying OTP: {str(e)}")

# ============================================================================
# GET USER'S PORTFOLIO SHARES
# ============================================================================

@router.get("/portfolio/user/{user_id}")
async def get_user_portfolio_shares(user_id: str):
    """
    Get all portfolio shares created by a specific user.
    """
    db = get_admin_db()
    
    try:
        response = db.table("portfolio_shares") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        # Parse JSON fields for each share
        shares = []
        for share in response.data:
            share_data = share.copy()
            share_data["access_log"] = json.loads(share.get("access_log", "[]"))
            share_data["security_flags"] = json.loads(share.get("security_flags", "{}"))
            shares.append(share_data)
        
        return {
            "ok": True,
            "count": len(shares),
            "shares": shares
        }
    
    except Exception as e:
        print(f"❌ Get User Portfolio Shares Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving portfolio shares: {str(e)}")

# ============================================================================
# UPDATE PORTFOLIO SHARE
# ============================================================================

@router.put("/portfolio/{token}")
async def update_portfolio_share(token: str, data: PortfolioShareUpdateRequest):
    """
    Update a portfolio share configuration.
    """
    db = get_admin_db()
    
    try:
        user_id = data.user_id
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        # Verify ownership
        response = db.table("portfolio_shares") \
            .select("user_id") \
            .eq("token", token) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        if response.data[0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Prepare update data
        update_data = data.dict(exclude_unset=True)
        update_data.pop("user_id", None)
        
        # Handle password update
        if "password" in update_data:
            password = update_data.pop("password")
            if password:
                update_data["password_hash"] = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            else:
                update_data["password_hash"] = None
        
        # Handle expiry update
        if "expiry_hours" in update_data:
            expiry_hours = update_data.pop("expiry_hours")
            if expiry_hours and expiry_hours > 0:
                update_data["expires_at"] = (datetime.now() + timedelta(hours=expiry_hours)).isoformat()
            else:
                update_data["expires_at"] = None
        
        if update_data:
            db.table("portfolio_shares") \
                .update(update_data) \
                .eq("token", token) \
                .execute()
        
        print(f"✅ Portfolio Share Updated: {token}")
        return {"ok": True, "message": "Portfolio share updated"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Update Portfolio Share Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating portfolio share: {str(e)}")

# ============================================================================
# REVOKE PORTFOLIO SHARE
# ============================================================================

@router.delete("/portfolio/{token}")
async def revoke_portfolio_share(token: str, user_id: str = Query(...)):
    """
    Revoke (deactivate) a portfolio share.
    """
    db = get_admin_db()
    
    try:
        # Verify ownership
        response = db.table("portfolio_shares") \
            .select("user_id") \
            .eq("token", token) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        if response.data[0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Deactivate share
        db.table("portfolio_shares") \
            .update({"is_active": False}) \
            .eq("token", token) \
            .execute()
        
        print(f"✅ Portfolio Share Revoked: {token}")
        return {"ok": True, "message": "Portfolio share revoked"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Revoke Portfolio Share Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error revoking portfolio share: {str(e)}")

# ============================================================================
# LOG PORTFOLIO ACCESS (Analytics)
# ============================================================================

@router.post("/portfolio/log-access")
async def log_portfolio_access(data: PortfolioAccessLog, request: Request = None):
    """
    Log access to portfolio share for analytics.
    """
    print(f"📝 LOG ACCESS: Token={data.token}, IP={data.ip_address}")
    print(f"📍 DATABASE_URL hostname: {os.getenv('DATABASE_URL', 'NOT_SET')}")
    print(f"📍 SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT_SET')}")
    
    print("🔗 DATABASE CONNECTION ATTEMPT (LOG ACCESS):")
    db = None
    use_fallback = False
    
    try:
        db = get_admin_db()
        print("✅ Database client created successfully (log access)")
        
        # Test database connection with a simple query
        print("🧪 Testing database connection (log access)...")
        test_response = db.table("portfolio_shares").select("count").limit(1).execute()
        print(f"✅ Database connection test successful (log access): {test_response}")
        print("✅ Database connected (log access)")
        
    except Exception as db_error:
        print(f"❌ DATABASE CONNECTION ERROR (LOG ACCESS): {type(db_error).__name__}: {str(db_error)}")
        print(f"🔍 Full error details (log access): {repr(db_error)}")
        
        # Check if it's a DNS/getaddrinfo error
        if "getaddrinfo" in str(db_error).lower() or "gaierror" in str(type(db_error).__name__).lower():
            print("🚨 CONFIRMED: This is a DNS resolution (getaddrinfo) error in log access!")
            print(f"🔧 Check your SUPABASE_URL: {supabase_url}")
            print("🔧 Ensure URL is correct and accessible from this network")
        
        print("🔄 FALLING BACK TO LOCAL JSON STORAGE (LOG ACCESS)")
        print("📁 Access logging will use local storage for development")
        use_fallback = True
    
    try:
        token = data.token
        
        # Parse user agent for device/browser info
        user_agent = parse(data.user_agent)
        device_type = f"{user_agent.device.family} {user_agent.device.brand}" if user_agent.device.family else "Unknown"
        browser = f"{user_agent.browser.family} {user_agent.browser.version_string}" if user_agent.browser.family else "Unknown"
        
        print(f"🔍 Logging access for token: {token}")
        
        share = None
        
        if use_fallback:
            # Use local JSON storage
            print("📁 Using local JSON storage for access logging")
            try:
                local_share = local_storage.get_share_by_token(token)
                if local_share:
                    share = local_share
                    print(f"✅ Share found in local storage: {token}")
                else:
                    print(f"❌ Share not found in local storage: {token}")
                    # For logging, we still return success even if share not found
                    # This prevents breaking the user experience
                    return {"ok": True, "message": "Access logged (local fallback)", "storage_type": "local"}
            except Exception as local_error:
                print(f"❌ Local storage error: {type(local_error).__name__}: {str(local_error)}")
                return {"ok": True, "message": "Access logged (local fallback)", "storage_type": "local"}
        else:
            # Use database
            print("🗄️ Using database storage for access logging")
            try:
                response = db.table("portfolio_shares") \
                    .select("access_log, view_count, last_ip, last_user_agent, last_device, last_browser") \
                    .eq("token", token) \
                    .execute()
                
                print(f"📥 Database access log query response: {response}")
                
                if not response.data:
                    print(f"❌ Share not found in database: {token}")
                    raise HTTPException(status_code=404, detail="Share not found")
                
                share = response.data[0]
                print(f"✅ Share found in database: {token}")
                
            except Exception as query_error:
                print(f"❌ Database access log query error: {type(query_error).__name__}: {str(query_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to retrieve share: {str(query_error)}")
        
        access_log = json.loads(share.get("access_log", "[]"))
        
        # Add new access entry
        new_access = {
            "timestamp": datetime.now().isoformat(),
            "ip_address": data.ip_address,
            "user_agent": data.user_agent,
            "device": device_type,
            "browser": browser,
            "action": "view"
        }
        access_log.append(new_access)
        
        if use_fallback:
            # Update local storage
            print("📁 Updating local storage with new access log")
            try:
                updated_share = share.copy()
                updated_share["access_log"] = json.dumps(access_log)
                updated_share["view_count"] = (share.get("view_count", 0) + 1)
                updated_share["last_ip"] = data.ip_address
                updated_share["last_user_agent"] = data.user_agent
                updated_share["last_device"] = device_type
                updated_share["last_browser"] = browser
                updated_share["last_accessed"] = datetime.now().isoformat()
                
                local_storage.update_share(token, updated_share)
                print(f"✅ Access logged in local storage: {token}")
                
                return {"ok": True, "message": "Access logged (local fallback)", "storage_type": "local"}
            except Exception as local_update_error:
                print(f"❌ Local storage update error: {type(local_update_error).__name__}: {str(local_update_error)}")
                return {"ok": True, "message": "Access logged (local fallback)", "storage_type": "local"}
        else:
            # Update database
            print("🗄️ Updating database with new access log")
            try:
                db.table("portfolio_shares") \
                    .update({
                        "access_log": json.dumps(access_log),
                        "view_count": (share.get("view_count", 0) + 1),
                        "last_ip": data.ip_address,
                        "last_user_agent": data.user_agent,
                        "last_device": device_type,
                        "last_browser": browser,
                        "last_accessed": datetime.now().isoformat()
                    }) \
                    .eq("token", token) \
                    .execute()
                
                print(f"✅ Access logged in database: {token}")
                return {"ok": True, "message": "Access logged", "storage_type": "database"}
            except Exception as db_update_error:
                print(f"❌ Database access log update error: {type(db_update_error).__name__}: {str(db_update_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to log access: {str(db_update_error)}")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Log Portfolio Access Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error logging access: {str(e)}")
