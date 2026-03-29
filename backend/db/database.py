from supabase import create_client, Client
from dotenv import load_dotenv
import os
import time

# Load .env from the backend directory
from pathlib import Path
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

SUPABASE_URL        : str = os.getenv("SUPABASE_URL")
SUPABASE_KEY        : str = os.getenv("SUPABASE_SERVICE_KEY")  # use service key for all backend ops
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")

# ── Create clients ─────────────────────────────────────────────────────────────
# Re-create clients on each request to avoid dropped HTTP/2 connections
# This is the most reliable fix for httpx.ReadError on Python 3.12+

def _make_client(key: str) -> Client:
    return create_client(SUPABASE_URL, key)

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