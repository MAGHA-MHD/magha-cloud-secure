import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
import io

from app.database import get_db
from app.models.schemas import (
    FileInfo, FileListResponse, ShareFileRequest, ShareInfo, MessageResponse,
)
from app.utils.security import get_current_user
from app.utils.encryption import generate_encryption_key, encrypt_file, decrypt_file
from app.config import UPLOAD_DIR, MAX_FILE_SIZE

router = APIRouter(prefix="/api/files", tags=["Files"])


def ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=FileListResponse)
async def list_files(current_user: dict = Depends(get_current_user)):
    """List all files owned by the current user."""
    with get_db() as conn:
        files = conn.execute(
            "SELECT * FROM files WHERE owner_id = ? ORDER BY created_at DESC",
            (current_user["id"],),
        ).fetchall()

    file_list = [
        FileInfo(
            id=f["id"],
            filename=f["original_filename"],
            original_filename=f["original_filename"],
            file_size=f["file_size"],
            mime_type=f["mime_type"],
            created_at=str(f["created_at"]),
            updated_at=str(f["updated_at"]),
        )
        for f in files
    ]

    return FileListResponse(files=file_list, total=len(file_list))


@router.post("/upload", response_model=FileInfo)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a file with AES-256 encryption."""
    ensure_upload_dir()

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Check file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)} MB.",
        )

    # Check storage quota
    if current_user["storage_used"] + file_size > current_user["storage_limit"]:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Storage quota exceeded. Please upgrade your plan.",
        )

    # Generate encryption key and encrypt file
    key_b64, iv_b64 = generate_encryption_key()
    encrypted_content = encrypt_file(content, key_b64, iv_b64)

    # Save encrypted file
    stored_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)
    with open(file_path, "wb") as f:
        f.write(encrypted_content)

    # Save metadata to database
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO files (owner_id, filename, original_filename, file_size, mime_type, encryption_key, encryption_iv)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                current_user["id"],
                stored_filename,
                file.filename,
                file_size,
                file.content_type or "application/octet-stream",
                key_b64,
                iv_b64,
            ),
        )
        file_id = cursor.lastrowid

        # Update storage used
        conn.execute(
            "UPDATE users SET storage_used = storage_used + ? WHERE id = ?",
            (file_size, current_user["id"]),
        )

        new_file = conn.execute(
            "SELECT * FROM files WHERE id = ?", (file_id,)
        ).fetchone()

    return FileInfo(
        id=new_file["id"],
        filename=new_file["original_filename"],
        original_filename=new_file["original_filename"],
        file_size=new_file["file_size"],
        mime_type=new_file["mime_type"],
        created_at=str(new_file["created_at"]),
        updated_at=str(new_file["updated_at"]),
    )


@router.get("/{file_id}/download")
async def download_file(file_id: int, current_user: dict = Depends(get_current_user)):
    """Download and decrypt a file."""
    with get_db() as conn:
        file_record = conn.execute(
            "SELECT * FROM files WHERE id = ?", (file_id,)
        ).fetchone()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    file_dict = dict(file_record)

    # Check access: owner or shared
    has_access = file_dict["owner_id"] == current_user["id"]
    if not has_access:
        with get_db() as conn:
            share = conn.execute(
                "SELECT * FROM file_shares WHERE file_id = ? AND shared_with_id = ?",
                (file_id, current_user["id"]),
            ).fetchone()
            if share:
                share_dict = dict(share)
                # Check expiration
                if share_dict["expires_at"]:
                    expires = datetime.fromisoformat(share_dict["expires_at"])
                    if expires < datetime.now(timezone.utc):
                        raise HTTPException(status_code=403, detail="Share link has expired")
                has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    # Read and decrypt file
    file_path = os.path.join(UPLOAD_DIR, file_dict["filename"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File data not found on disk")

    with open(file_path, "rb") as f:
        encrypted_content = f.read()

    decrypted_content = decrypt_file(
        encrypted_content, file_dict["encryption_key"], file_dict["encryption_iv"]
    )

    return StreamingResponse(
        io.BytesIO(decrypted_content),
        media_type=file_dict["mime_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{file_dict["original_filename"]}"',
            "Content-Length": str(len(decrypted_content)),
        },
    )


@router.delete("/{file_id}", response_model=MessageResponse)
async def delete_file(file_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a file (owner only)."""
    with get_db() as conn:
        file_record = conn.execute(
            "SELECT * FROM files WHERE id = ? AND owner_id = ?",
            (file_id, current_user["id"]),
        ).fetchone()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    file_dict = dict(file_record)

    # Delete file from disk
    file_path = os.path.join(UPLOAD_DIR, file_dict["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete from database
    with get_db() as conn:
        conn.execute("DELETE FROM file_shares WHERE file_id = ?", (file_id,))
        conn.execute("DELETE FROM files WHERE id = ?", (file_id,))
        conn.execute(
            "UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?",
            (file_dict["file_size"], current_user["id"]),
        )

    return MessageResponse(message="File deleted successfully")


@router.post("/{file_id}/share", response_model=ShareInfo)
async def share_file(
    file_id: int,
    share_data: ShareFileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Share a file with another user or generate a share link."""
    with get_db() as conn:
        file_record = conn.execute(
            "SELECT * FROM files WHERE id = ? AND owner_id = ?",
            (file_id, current_user["id"]),
        ).fetchone()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found or access denied")

    file_dict = dict(file_record)
    share_token = uuid.uuid4().hex
    shared_with_id = None
    shared_with_email = share_data.shared_with_email

    # If sharing with a specific user, look them up
    if shared_with_email:
        with get_db() as conn:
            target_user = conn.execute(
                "SELECT id FROM users WHERE email = ?", (shared_with_email,)
            ).fetchone()
            if target_user:
                shared_with_id = target_user["id"]

    expires_at = None
    if share_data.expires_hours:
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=share_data.expires_hours)).isoformat()

    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO file_shares (file_id, owner_id, shared_with_id, shared_with_email, permission, share_token, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                file_id,
                current_user["id"],
                shared_with_id,
                shared_with_email,
                share_data.permission,
                share_token,
                expires_at,
            ),
        )
        share_id = cursor.lastrowid

    return ShareInfo(
        id=share_id,
        file_id=file_id,
        filename=file_dict["original_filename"],
        owner_email=current_user["email"],
        shared_with_email=shared_with_email,
        permission=share_data.permission,
        share_token=share_token,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/shared/with-me", response_model=list[ShareInfo])
async def list_shared_with_me(current_user: dict = Depends(get_current_user)):
    """List files shared with the current user."""
    with get_db() as conn:
        shares = conn.execute(
            """SELECT fs.*, f.original_filename, u.email as owner_email
               FROM file_shares fs
               JOIN files f ON fs.file_id = f.id
               JOIN users u ON fs.owner_id = u.id
               WHERE fs.shared_with_id = ?
               ORDER BY fs.created_at DESC""",
            (current_user["id"],),
        ).fetchall()

    return [
        ShareInfo(
            id=s["id"],
            file_id=s["file_id"],
            filename=s["original_filename"],
            owner_email=s["owner_email"],
            shared_with_email=s["shared_with_email"],
            permission=s["permission"],
            share_token=s["share_token"],
            expires_at=s["expires_at"],
            created_at=str(s["created_at"]),
        )
        for s in shares
    ]


@router.get("/{file_id}/shares", response_model=list[ShareInfo])
async def list_file_shares(file_id: int, current_user: dict = Depends(get_current_user)):
    """List all shares for a file (owner only)."""
    with get_db() as conn:
        file_record = conn.execute(
            "SELECT * FROM files WHERE id = ? AND owner_id = ?",
            (file_id, current_user["id"]),
        ).fetchone()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found or access denied")

    with get_db() as conn:
        shares = conn.execute(
            """SELECT fs.*, f.original_filename, u.email as owner_email
               FROM file_shares fs
               JOIN files f ON fs.file_id = f.id
               JOIN users u ON fs.owner_id = u.id
               WHERE fs.file_id = ?""",
            (file_id,),
        ).fetchall()

    return [
        ShareInfo(
            id=s["id"],
            file_id=s["file_id"],
            filename=s["original_filename"],
            owner_email=s["owner_email"],
            shared_with_email=s["shared_with_email"],
            permission=s["permission"],
            share_token=s["share_token"],
            expires_at=s["expires_at"],
            created_at=str(s["created_at"]),
        )
        for s in shares
    ]


@router.delete("/shares/{share_id}", response_model=MessageResponse)
async def revoke_share(share_id: int, current_user: dict = Depends(get_current_user)):
    """Revoke a file share."""
    with get_db() as conn:
        share = conn.execute(
            "SELECT * FROM file_shares WHERE id = ? AND owner_id = ?",
            (share_id, current_user["id"]),
        ).fetchone()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    with get_db() as conn:
        conn.execute("DELETE FROM file_shares WHERE id = ?", (share_id,))

    return MessageResponse(message="Share revoked successfully")
