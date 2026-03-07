import os
from dotenv import load_dotenv

load_dotenv()

# JWT Settings
SECRET_KEY = os.getenv("SECRET_KEY", "magha-cloud-secure-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# File storage
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(100 * 1024 * 1024)))  # 100MB default

# Storage plans (in bytes)
STORAGE_PLANS = {
    "free": 500 * 1024 * 1024,       # 500 MB
    "starter": 5 * 1024 * 1024 * 1024,  # 5 GB
    "pro": 50 * 1024 * 1024 * 1024,     # 50 GB
    "enterprise": 500 * 1024 * 1024 * 1024,  # 500 GB
}

PLAN_PRICES = {
    "free": 0,
    "starter": 5,    # 5 EUR/month
    "pro": 15,       # 15 EUR/month
    "enterprise": 49  # 49 EUR/month
}
