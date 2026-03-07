import os
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad


def generate_encryption_key() -> tuple[str, str]:
    """Generate a random AES-256 key and IV."""
    key = os.urandom(32)  # 256 bits
    iv = os.urandom(16)   # 128 bits for AES block size
    return base64.b64encode(key).decode(), base64.b64encode(iv).decode()


def encrypt_file(data: bytes, key_b64: str, iv_b64: str) -> bytes:
    """Encrypt file data using AES-256-CBC."""
    key = base64.b64decode(key_b64)
    iv = base64.b64decode(iv_b64)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    padded_data = pad(data, AES.block_size)
    encrypted = cipher.encrypt(padded_data)
    return encrypted


def decrypt_file(encrypted_data: bytes, key_b64: str, iv_b64: str) -> bytes:
    """Decrypt file data using AES-256-CBC."""
    key = base64.b64decode(key_b64)
    iv = base64.b64decode(iv_b64)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted_padded = cipher.decrypt(encrypted_data)
    decrypted = unpad(decrypted_padded, AES.block_size)
    return decrypted
