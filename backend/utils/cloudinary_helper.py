import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv
import os
import base64

load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key    = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure     = True
)

FOLDER = os.getenv("CLOUDINARY_FOLDER", "pinit-thumbnails")


def upload_thumbnail(file_bytes: bytes, asset_id: str) -> dict:
    """
    Upload image thumbnail to Cloudinary.
    Returns { url, public_id, width, height }
    """
    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id      = f"{FOLDER}/{asset_id}",
            folder         = FOLDER,
            overwrite      = True,
            resource_type  = "image",
            transformation = [
                {
                    "width":   400,
                    "height":  400,
                    "crop":    "limit",    # shrink if larger, never enlarge
                    "quality": "auto",     # Cloudinary auto-optimises
                    "fetch_format": "auto" # serve webp to modern browsers
                }
            ]
        )
        return {
            "success"   : True,
            "url"       : result["secure_url"],
            "public_id" : result["public_id"],
            "width"     : result.get("width"),
            "height"    : result.get("height"),
        }
    except Exception as e:
        return {
            "success" : False,
            "error"   : str(e),
            "url"     : None
        }


def upload_thumbnail_base64(base64_str: str, asset_id: str) -> dict:
    """
    Upload from base64 string (what your React app sends as thumbnail).
    base64_str can be a full data URL like data:image/jpeg;base64,/9j/...
    """
    try:
        result = cloudinary.uploader.upload(
            base64_str,
            public_id      = f"{FOLDER}/{asset_id}",
            folder         = FOLDER,
            overwrite      = True,
            resource_type  = "image",
            transformation = [
                {
                    "width":   400,
                    "height":  400,
                    "crop":    "limit",
                    "quality": "auto",
                    "fetch_format": "auto"
                }
            ]
        )
        return {
            "success"   : True,
            "url"       : result["secure_url"],
            "public_id" : result["public_id"],
            "width"     : result.get("width"),
            "height"    : result.get("height"),
        }
    except Exception as e:
        return {
            "success" : False,
            "error"   : str(e),
            "url"     : None
        }


def delete_thumbnail(asset_id: str) -> bool:
    """
    Delete image from Cloudinary when asset is removed from vault.
    """
    try:
        result = cloudinary.uploader.destroy(
            f"{FOLDER}/{asset_id}",
            resource_type = "image"
        )
        return result.get("result") == "ok"
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        return False


def get_thumbnail_url(asset_id: str) -> str:
    """
    Get the public URL for a stored thumbnail.
    """
    return cloudinary.CloudinaryImage(
        f"{FOLDER}/{asset_id}"
    ).build_url(
        width        = 400,
        height       = 400,
        crop         = "limit",
        quality      = "auto",
        fetch_format = "auto",
        secure       = True
    )