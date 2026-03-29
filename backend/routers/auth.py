from fastapi import APIRouter, HTTPException, Request, Depends
from datetime import datetime, timedelta
from passlib.context import CryptContext
from ..db.database import get_admin_db
from ..models.schemas import (
    UserRegister, OTPVerify, OTPResend,
    WebAuthnRegisterStart, WebAuthnRegisterFinish,
    WebAuthnLoginStart, WebAuthnLoginFinish
)
from ..utils.auth_helpers import (
    generate_jwt, generate_otp,
    get_current_user, log_action
)
from ..utils.email_helper import send_otp_email, send_new_device_email
import os
import json

router = APIRouter(tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

RP_ID   = os.getenv("RP_ID",   "localhost")
RP_NAME = os.getenv("RP_NAME", "PINIT")


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(data: UserRegister, request: Request):
    db = get_admin_db()

    # Check email exists
    existing = db.table("users").select("id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username exists
    existing_user = db.table("users").select("id").eq("username", data.username).execute()
    if existing_user.data:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user
    new_user = db.table("users").insert({
        "username"      : data.username,
        "email"         : data.email,
        "role"          : "user",
        "is_active"     : True,
        "email_verified": False,
        "password_hash" : pwd_context.hash(data.password) if data.password else None
    }).execute()

    user = new_user.data[0]

    # Generate OTP
    otp_code   = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    db.table("otp_codes").insert({
        "email"     : data.email,
        "code"      : otp_code,
        "expires_at": expires_at.isoformat(),
        "used"      : False
    }).execute()

    send_otp_email(data.email, otp_code, data.username)
    log_action(user["id"], "register", {"email": data.email}, str(request.client.host))

    return {
        "message": "Registration successful. Check your email for OTP.",
        "email"  : data.email
    }


# ── Password Login ────────────────────────────────────────────────────────────

@router.post("/login")
async def login(data: dict, request: Request):
    db    = get_admin_db()
    email = data.get("email", "").lower().strip()
    pwd   = data.get("password", "")

    user_result = db.table("users").select("*").eq("email", email).execute()
    if not user_result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = user_result.data[0]

    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account suspended")

    stored_pwd = user.get("password_hash", "")
    if not stored_pwd or not pwd_context.verify(pwd, stored_pwd):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = generate_jwt(user["id"], user["role"])
    log_action(user["id"], "login_password", {}, str(request.client.host))

    return {
        "access_token": token,
        "token_type"  : "bearer",
        "user"        : {
            "id"      : user["id"],
            "username": user["username"],
            "email"   : user["email"],
            "role"    : user["role"]
        }
    }


# ── Admin Login ───────────────────────────────────────────────────────────────

@router.post("/admin-login")
async def admin_login(data: dict, request: Request):
    db       = get_admin_db()
    username = data.get("username", "")
    pwd      = data.get("password", "")

    user_result = db.table("users").select("*") \
        .eq("username", username).eq("role", "admin").execute()

    if not user_result.data:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    user       = user_result.data[0]
    stored_pwd = user.get("password_hash", "")

    if not stored_pwd or not pwd_context.verify(pwd, stored_pwd):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = generate_jwt(user["id"], user["role"])
    log_action(user["id"], "admin_login", {}, str(request.client.host))

    return {
        "access_token": token,
        "token_type"  : "bearer",
        "user"        : {
            "id"      : user["id"],
            "username": user["username"],
            "email"   : user["email"],
            "role"    : user["role"]
        }
    }


# ── Verify OTP ────────────────────────────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(data: OTPVerify, request: Request):
    db = get_admin_db()

    result = db.table("otp_codes") \
        .select("*") \
        .eq("email", data.email) \
        .eq("code", data.code) \
        .eq("used", False) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    otp        = result.data[0]
    expires_at = datetime.fromisoformat(otp["expires_at"].replace("Z", "+00:00"))

    if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    db.table("otp_codes").update({"used": True}).eq("id", otp["id"]).execute()
    db.table("users").update({"email_verified": True}).eq("email", data.email).execute()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    user        = user_result.data[0]

    log_action(user["id"], "verify_otp", {"email": data.email}, str(request.client.host))

    return {
        "message" : "Email verified successfully",
        "verified": True,
        "user_id" : user["id"]
    }


# ── Resend OTP ────────────────────────────────────────────────────────────────

@router.post("/resend-otp")
async def resend_otp(data: OTPResend):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Email not found")

    user       = user_result.data[0]
    otp_code   = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    db.table("otp_codes").insert({
        "email"     : data.email,
        "code"      : otp_code,
        "expires_at": expires_at.isoformat(),
        "used"      : False
    }).execute()

    send_otp_email(data.email, otp_code, user["username"])
    return {"message": "New OTP sent to your email"}


# ── Get Current User ──────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user


# ── WebAuthn Register Start ───────────────────────────────────────────────────

@router.post("/webauthn/register-start")
async def webauthn_register_start(data: WebAuthnRegisterStart):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data[0]

    if not user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Please verify your email first")

    try:
        from webauthn import generate_registration_options
        from webauthn.helpers.structs import (
            AuthenticatorSelectionCriteria,
            UserVerificationRequirement,
            ResidentKeyRequirement
        )
        from webauthn.helpers.cose import COSEAlgorithmIdentifier
        import base64

        options = generate_registration_options(
            rp_id                   = RP_ID,
            rp_name                 = RP_NAME,
            user_id                 = user["id"].encode(),
            user_name               = user["email"],
            user_display_name       = user["username"],
            authenticator_selection = AuthenticatorSelectionCriteria(
                user_verification = UserVerificationRequirement.REQUIRED,
                resident_key      = ResidentKeyRequirement.PREFERRED
            ),
            supported_pub_key_algs  = [
                COSEAlgorithmIdentifier.ECDSA_SHA_256,
                COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256
            ]
        )

        challenge_b64 = base64.b64encode(options.challenge).decode()
        db.table("otp_codes").insert({
            "email"     : data.email,
            "code"      : f"WA_CHALLENGE_{challenge_b64}",
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            "used"      : False
        }).execute()

        from webauthn import options_to_json
        return json.loads(options_to_json(options))

    except ImportError:
        raise HTTPException(status_code=500, detail="WebAuthn not installed. Run: pip install pywebauthn")


# ── WebAuthn Register Finish ──────────────────────────────────────────────────

@router.post("/webauthn/register-finish")
async def webauthn_register_finish(data: WebAuthnRegisterFinish, request: Request):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data[0]

    try:
        from webauthn import verify_registration_response
        from webauthn.helpers.structs import RegistrationCredential
        import base64

        challenge_result = db.table("otp_codes") \
            .select("*") \
            .eq("email", data.email) \
            .eq("used", False) \
            .like("code", "WA_CHALLENGE_%") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not challenge_result.data:
            raise HTTPException(status_code=400, detail="Challenge not found or expired")

        challenge_row = challenge_result.data[0]
        challenge_b64 = challenge_row["code"].replace("WA_CHALLENGE_", "")
        challenge     = base64.b64decode(challenge_b64)

        db.table("otp_codes").update({"used": True}).eq("id", challenge_row["id"]).execute()

        verification = verify_registration_response(
            credential         = RegistrationCredential.parse_raw(json.dumps(data.credential)),
            expected_challenge = challenge,
            expected_rp_id     = RP_ID,
            expected_origin    = os.getenv("APP_URL", "http://localhost:3000")
        )

        db.table("biometric_credentials").insert({
            "user_id"      : user["id"],
            "credential_id": base64.urlsafe_b64encode(verification.credential_id).decode(),
            "public_key"   : base64.b64encode(verification.credential_public_key).decode(),
            "device_name"  : data.device_name,
            "sign_count"   : verification.sign_count
        }).execute()

        send_new_device_email(user["email"], user["username"], data.device_name)
        log_action(user["id"], "biometric_register", {"device": data.device_name}, str(request.client.host))

        return {"message": "Biometric registered successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")


# ── WebAuthn Login Start ──────────────────────────────────────────────────────

@router.post("/webauthn/login-start")
async def webauthn_login_start(data: WebAuthnLoginStart):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data[0]

    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account suspended")

    creds_result = db.table("biometric_credentials") \
        .select("*").eq("user_id", user["id"]).execute()

    if not creds_result.data:
        raise HTTPException(status_code=400, detail="No biometric registered. Please register first.")

    try:
        from webauthn import generate_authentication_options
        from webauthn.helpers.structs import UserVerificationRequirement, PublicKeyCredentialDescriptor
        import base64

        allow_credentials = [
            PublicKeyCredentialDescriptor(
                id = base64.urlsafe_b64decode(cred["credential_id"] + "==")
            )
            for cred in creds_result.data
        ]

        options = generate_authentication_options(
            rp_id             = RP_ID,
            allow_credentials = allow_credentials,
            user_verification = UserVerificationRequirement.REQUIRED
        )

        challenge_b64 = base64.b64encode(options.challenge).decode()
        db.table("otp_codes").insert({
            "email"     : data.email,
            "code"      : f"WA_AUTH_{challenge_b64}",
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            "used"      : False
        }).execute()

        from webauthn import options_to_json
        return json.loads(options_to_json(options))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── WebAuthn Login Finish ─────────────────────────────────────────────────────

@router.post("/webauthn/login-finish")
async def webauthn_login_finish(data: WebAuthnLoginFinish, request: Request):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data[0]

    try:
        from webauthn import verify_authentication_response
        from webauthn.helpers.structs import AuthenticationCredential
        import base64

        challenge_result = db.table("otp_codes") \
            .select("*") \
            .eq("email", data.email) \
            .eq("used", False) \
            .like("code", "WA_AUTH_%") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not challenge_result.data:
            raise HTTPException(status_code=400, detail="Challenge expired")

        challenge_row = challenge_result.data[0]
        challenge     = base64.b64decode(challenge_row["code"].replace("WA_AUTH_", ""))
        db.table("otp_codes").update({"used": True}).eq("id", challenge_row["id"]).execute()

        cred_id_raw = data.credential.get("id", "")
        all_creds   = db.table("biometric_credentials").select("*").eq("user_id", user["id"]).execute()

        matched_cred = None
        for cred in all_creds.data:
            if cred["credential_id"].rstrip("=") == cred_id_raw.rstrip("="):
                matched_cred = cred
                break

        if not matched_cred:
            raise HTTPException(status_code=400, detail="Credential not found")

        verification = verify_authentication_response(
            credential                    = AuthenticationCredential.parse_raw(json.dumps(data.credential)),
            expected_challenge            = challenge,
            expected_rp_id               = RP_ID,
            expected_origin              = os.getenv("APP_URL", "http://localhost:3000"),
            credential_public_key        = base64.b64decode(matched_cred["public_key"]),
            credential_current_sign_count = matched_cred["sign_count"]
        )

        db.table("biometric_credentials").update({
            "sign_count": verification.new_sign_count
        }).eq("id", matched_cred["id"]).execute()

        token = generate_jwt(user["id"], user["role"])
        log_action(user["id"], "login_biometric", {"device": matched_cred.get("device_name")}, str(request.client.host))

        return {
            "access_token": token,
            "token_type"  : "bearer",
            "user"        : {
                "id"      : user["id"],
                "username": user["username"],
                "email"   : user["email"],
                "role"    : user["role"]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")