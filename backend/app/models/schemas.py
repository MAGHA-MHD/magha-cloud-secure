from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# Auth schemas
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = ""


class UserLogin(BaseModel):
    email: str
    password: str
    mfa_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_mfa: bool = False


class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    message: str


class MFAVerifyRequest(BaseModel):
    code: str


class UserProfile(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    plan: str
    storage_used: int
    storage_limit: int
    mfa_enabled: bool
    created_at: str


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    plan: Optional[str] = None


# File schemas
class FileInfo(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    created_at: str
    updated_at: str


class FileListResponse(BaseModel):
    files: list[FileInfo]
    total: int


class ShareFileRequest(BaseModel):
    shared_with_email: Optional[str] = None
    permission: str = "read"
    expires_hours: Optional[int] = None


class ShareInfo(BaseModel):
    id: int
    file_id: int
    filename: str
    owner_email: str
    shared_with_email: Optional[str]
    permission: str
    share_token: Optional[str]
    expires_at: Optional[str]
    created_at: str


class StorageQuota(BaseModel):
    plan: str
    storage_used: int
    storage_limit: int
    usage_percentage: float
    plan_price: float


class MessageResponse(BaseModel):
    message: str
