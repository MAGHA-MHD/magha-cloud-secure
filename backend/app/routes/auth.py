import io
import base64
from datetime import datetime, timedelta, timezone

import pyotp
import qrcode
from fastapi import APIRouter, HTTPException, status, Depends

from app.database import get_db
from app.models.schemas import (
    UserRegister, UserLogin, TokenResponse, MFASetupResponse,
    MFAVerifyRequest, UserProfile, MessageResponse,
)
from app.utils.security import (
    hash_password, verify_password, create_access_token, get_current_user,
)
from app.config import STORAGE_PLANS

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=MessageResponse)
async def register(user_data: UserRegister):
    """Register a new user."""
    with get_db() as conn:
        # Check if email already exists
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (user_data.email,)
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Check if username already exists
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (user_data.username,)
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        hashed = hash_password(user_data.password)
        storage_limit = STORAGE_PLANS["free"]

        conn.execute(
            """INSERT INTO users (email, username, hashed_password, full_name, plan, storage_limit)
               VALUES (?, ?, ?, ?, 'free', ?)""",
            (user_data.email, user_data.username, hashed, user_data.full_name or "", storage_limit),
        )

    return MessageResponse(message="User registered successfully")


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user and return JWT token."""
    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?", (credentials.email,)
        ).fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_dict = dict(user)
    if not verify_password(credentials.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if MFA is enabled
    if user_dict["mfa_enabled"]:
        if not credentials.mfa_code:
            return TokenResponse(
                access_token="",
                requires_mfa=True,
            )

        # Verify MFA code
        totp = pyotp.TOTP(user_dict["mfa_secret"])
        if not totp.verify(credentials.mfa_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA code",
            )

    token = create_access_token(data={"sub": str(user_dict["id"]), "email": user_dict["email"]})
    return TokenResponse(access_token=token, requires_mfa=False)


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return UserProfile(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        full_name=current_user["full_name"] or "",
        plan=current_user["plan"],
        storage_used=current_user["storage_used"],
        storage_limit=current_user["storage_limit"],
        mfa_enabled=bool(current_user["mfa_enabled"]),
        created_at=str(current_user["created_at"]),
    )


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(current_user: dict = Depends(get_current_user)):
    """Setup MFA for the current user. Returns a QR code for TOTP setup."""
    if current_user["mfa_enabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled",
        )

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user["email"],
        issuer_name="MAGHA Cloud Secure"
    )

    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_b64 = base64.b64encode(buffer.getvalue()).decode()

    # Save secret temporarily (will be confirmed on verify)
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET mfa_secret = ? WHERE id = ?",
            (secret, current_user["id"]),
        )

    return MFASetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_b64}",
        message="Scan the QR code with your authenticator app, then verify with a code.",
    )


@router.post("/mfa/verify", response_model=MessageResponse)
async def verify_mfa(
    request: MFAVerifyRequest,
    current_user: dict = Depends(get_current_user),
):
    """Verify MFA code and enable MFA for the user."""
    if not current_user["mfa_secret"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup not initiated. Call /mfa/setup first.",
        )

    totp = pyotp.TOTP(current_user["mfa_secret"])
    if not totp.verify(request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code. Please try again.",
        )

    with get_db() as conn:
        conn.execute(
            "UPDATE users SET mfa_enabled = 1 WHERE id = ?",
            (current_user["id"],),
        )

    return MessageResponse(message="MFA enabled successfully")


@router.post("/mfa/disable", response_model=MessageResponse)
async def disable_mfa(
    request: MFAVerifyRequest,
    current_user: dict = Depends(get_current_user),
):
    """Disable MFA for the current user (requires current MFA code)."""
    if not current_user["mfa_enabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled",
        )

    totp = pyotp.TOTP(current_user["mfa_secret"])
    if not totp.verify(request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code",
        )

    with get_db() as conn:
        conn.execute(
            "UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?",
            (current_user["id"],),
        )

    return MessageResponse(message="MFA disabled successfully")
