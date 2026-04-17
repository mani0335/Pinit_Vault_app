#!/usr/bin/env python3
"""
Pre-startup script for FastAPI
Copies dist/ folder to backend if frontend has been built
"""
import shutil
from pathlib import Path

def setup_frontend_assets():
    """Copy frontend dist to backend if it exists"""
    source = Path(__file__).parent.parent / "dist"
    dest = Path(__file__).parent / "dist"
    
    if source.exists() and source.is_dir():
        if dest.exists():
            shutil.rmtree(dest)
        
        try:
            shutil.copytree(source, dest)
            print(f"✅ Frontend assets copied from {source} to {dest}")
        except Exception as e:
            print(f"⚠️ Could not copy frontend assets: {e}")
    else:
        print(f"ℹ️  Frontend dist not found at {source} - serving from fallback")

if __name__ == "__main__":
    setup_frontend_assets()
