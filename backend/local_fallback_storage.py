"""
Local JSON fallback storage for portfolio shares when database is unavailable.
This allows the application to work locally even if Supabase is not accessible.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

class LocalShareStorage:
    """Local JSON file storage for portfolio shares."""
    
    def __init__(self):
        self.storage_dir = Path(__file__).parent / "local_storage"
        self.shares_file = self.storage_dir / "portfolio_shares.json"
        self._ensure_storage_dir()
        
    def _ensure_storage_dir(self):
        """Create storage directory if it doesn't exist."""
        self.storage_dir.mkdir(exist_ok=True)
        
        # Initialize shares file if it doesn't exist
        if not self.shares_file.exists():
            with open(self.shares_file, 'w') as f:
                json.dump({"shares": []}, f, indent=2)
    
    def _load_shares(self) -> List[Dict]:
        """Load shares from JSON file."""
        try:
            with open(self.shares_file, 'r') as f:
                data = json.load(f)
                return data.get("shares", [])
        except Exception as e:
            print(f"❌ Error loading shares: {e}")
            return []
    
    def _save_shares(self, shares: List[Dict]):
        """Save shares to JSON file."""
        try:
            with open(self.shares_file, 'w') as f:
                json.dump({"shares": shares}, f, indent=2)
            print(f"✅ Shares saved to local storage")
        except Exception as e:
            print(f"❌ Error saving shares: {e}")
    
    def create_share(self, share_data: Dict) -> Dict:
        """Create a new share."""
        shares = self._load_shares()
        
        # Add timestamps and metadata
        share_data.update({
            "created_at": datetime.now().isoformat(),
            "local_storage": True,
            "source": "fallback"
        })
        
        shares.append(share_data)
        self._save_shares(shares)
        
        print(f"✅ Share created in local storage: {share_data.get('token')}")
        return share_data
    
    def get_share_by_token(self, token: str) -> Optional[Dict]:
        """Get share by token."""
        shares = self._load_shares()
        for share in shares:
            if share.get("token") == token:
                return share
        return None
    
    def get_user_shares(self, user_id: str) -> List[Dict]:
        """Get all shares for a user."""
        shares = self._load_shares()
        user_shares = [share for share in shares if share.get("user_id") == user_id]
        return user_shares
    
    def update_share(self, token: str, updates: Dict) -> bool:
        """Update a share."""
        shares = self._load_shares()
        for i, share in enumerate(shares):
            if share.get("token") == token:
                shares[i].update(updates)
                self._save_shares(shares)
                return True
        return False
    
    def delete_share(self, token: str) -> bool:
        """Delete a share."""
        shares = self._load_shares()
        original_count = len(shares)
        shares = [share for share in shares if share.get("token") != token]
        
        if len(shares) < original_count:
            self._save_shares(shares)
            return True
        return False

# Global instance
local_storage = LocalShareStorage()
