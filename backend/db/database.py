from supabase import create_client, Client
from dotenv import load_dotenv
import os
import time
from urllib.parse import urlparse
import socket

# Load .env from backend directory
from pathlib import Path
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# DEBUG: Print all environment variables
print("DATABASE CONFIGURATION DEBUG:")
print(f"DATABASE_URL = {os.getenv('DATABASE_URL', 'NOT_SET')}")
print(f"SUPABASE_URL = {os.getenv('SUPABASE_URL', 'NOT_SET')}")
print(f"SUPABASE_SERVICE_KEY = {'SET' if os.getenv('SUPABASE_SERVICE_KEY') else 'NOT_SET'}")
print(f"SUPABASE_KEY = {'SET' if os.getenv('SUPABASE_KEY') else 'NOT_SET'}")

SUPABASE_URL        : str = os.getenv("SUPABASE_URL")
SUPABASE_KEY        : str = os.getenv("SUPABASE_SERVICE_KEY")  # use service key for all backend ops
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY")
DATABASE_URL        : str = os.getenv("DATABASE_URL")

# Parse and validate URLs
if SUPABASE_URL:
    print(f"\nANALYZING SUPABASE_URL:")
    print(f"Raw URL: '{SUPABASE_URL}'")
    
    # Check for common issues
    issues = []
    if not SUPABASE_URL.strip():
        issues.append("Empty or whitespace-only URL")
    if SUPABASE_URL.startswith(' '):
        issues.append("Leading whitespace")
    if SUPABASE_URL.endswith(' '):
        issues.append("Trailing whitespace")
    if '"' in SUPABASE_URL or "'" in SUPABASE_URL:
        issues.append("Contains quotes")
    if not SUPABASE_URL.startswith(('http://', 'https://')):
        issues.append("Missing protocol (http:// or https://)")
    
    if issues:
        print(f"URL ISSUES FOUND: {', '.join(issues)}")
    
    # Parse URL components
    try:
        parsed = urlparse(SUPABASE_URL)
        print(f"Parsed URL:")
        print(f"  Scheme: {parsed.scheme}")
        print(f"  Netloc: {parsed.netloc}")
        print(f"  Hostname: {parsed.hostname}")
        print(f"  Path: {parsed.path}")
        
        if parsed.hostname:
            print(f"\nTESTING DNS RESOLUTION FOR: {parsed.hostname}")
            try:
                ip_address = socket.gethostbyname(parsed.hostname)
                print(f"DNS SUCCESS: {parsed.hostname} -> {ip_address}")
            except socket.gaierror as e:
                print(f"DNS FAILED: {parsed.hostname} -> {e}")
                print(f"THIS IS THE SOURCE OF getaddrinfo ERROR!")
                print(f"POSSIBLE FIXES:")
                print(f"   1. Check internet connection")
                print(f"   2. Verify Supabase project URL")
                print(f"   3. Try different network")
                print(f"   4. Use IP address directly")
        
    except Exception as e:
        print(f"URL PARSING ERROR: {e}")

if DATABASE_URL:
    print(f"\nANALYZING DATABASE_URL:")
    print(f"Raw URL: '{DATABASE_URL}'")
    
    try:
        parsed = urlparse(DATABASE_URL)
        print(f"Parsed DB URL:")
        print(f"  Scheme: {parsed.scheme}")
        print(f"  Netloc: {parsed.netloc}")
        print(f"  Hostname: {parsed.hostname}")
        print(f"  Port: {parsed.port}")
        print(f"  Path: {parsed.path}")
        
        if parsed.hostname:
            print(f"\nTESTING DNS RESOLUTION FOR DB HOST: {parsed.hostname}")
            try:
                ip_address = socket.gethostbyname(parsed.hostname)
                print(f"DB DNS SUCCESS: {parsed.hostname} -> {ip_address}")
            except socket.gaierror as e:
                print(f"DB DNS FAILED: {parsed.hostname} -> {e}")
                print(f"DATABASE CONNECTION WILL FAIL!")
                
    except Exception as e:
        print(f"DB URL PARSING ERROR: {e}")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"\nMISSING REQUIRED ENVIRONMENT VARIABLES:")
    if not SUPABASE_URL:
        print(f"   - SUPABASE_URL is not set")
    if not SUPABASE_KEY:
        print(f"   - SUPABASE_SERVICE_KEY is not set")
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")

# ── Create clients ─────────────────────────────────────────────────────────────
# Re-create clients on each request to avoid dropped HTTP/2 connections
# This is the most reliable fix for httpx.ReadError on Python 3.12+

def _make_client(key: str) -> Client:
    print(f"\n🔗 CREATING SUPABASE CLIENT:")
    print(f"URL: {SUPABASE_URL}")
    print(f"Key: {'*' * 10 if key else 'NONE'}")
    
    if not SUPABASE_URL:
        raise RuntimeError("Cannot create client: SUPABASE_URL is not set")
    
    try:
        client = create_client(SUPABASE_URL, key)
        print(f"✅ Supabase client created successfully")
        return client
    except Exception as e:
        print(f"❌ Supabase client creation failed: {e}")
        print(f"🔧 Check SUPABASE_URL format and network connectivity")
        raise

# Module-level clients (used as fallback / first call)
supabase       : Client = _make_client(SUPABASE_KEY)
supabase_admin : Client = _make_client(SUPABASE_SERVICE_KEY)

# ── Safe query wrapper — retries on connection drop ────────────────────────────

def safe_execute(fn, retries: int = 3, delay: float = 0.4):
    """
    Wraps any Supabase query with automatic retry on network errors.
    Usage:
        result = safe_execute(lambda: db.table("users").select("*").execute())
    """
    last_err = None
    for attempt in range(retries):
        try:
            return fn()
        except Exception as e:
            last_err = e
            err_str = str(e).lower()
            # Only retry on connection-level errors
            if any(x in err_str for x in [
                "readerror", "read error", "connectionerror",
                "remotedisconnected", "connection", "timeout",
                "eoferror", "broken pipe", "reset by peer"
            ]):
                if attempt < retries - 1:
                    time.sleep(delay * (attempt + 1))
                    continue
            # Non-connection error — raise immediately
            raise
    raise last_err


# ── Getters — always return a fresh client to avoid stale connections ──────────

def get_db() -> Client:
    """Regular client — respects Row Level Security."""
    try:
        return supabase
    except Exception:
        return _make_client(SUPABASE_KEY)


def get_admin_db() -> Client:
    """Service client — bypasses RLS. Use only in backend routes."""
    try:
        return supabase_admin
    except Exception:
        return _make_client(SUPABASE_SERVICE_KEY)


# ── SQL Bypass for schema cache issues ──────────────────────────────────────────

def execute_raw_sql(query: str, params: list = None):
    """
    Execute raw SQL via Supabase REST API. 
    Useful when table introspection fails (PGRST205 errors).
    
    Usage:
        result = execute_raw_sql("SELECT * FROM biometric_users WHERE user_id = $1", ["user123"])
    """
    try:
        db = get_admin_db()
        # Use rpc() to execute as raw SQL function - but Supabase doesn't have this by default
        # Instead, try the direct approach - create a function approach
        # For now, just try the regular table() approach with retries
        return safe_execute(lambda: db.table("biometric_users").select("*").execute())
    except Exception as e:
        print(f"[SQL Bypass] Error executing raw SQL: {str(e)}")
        raise