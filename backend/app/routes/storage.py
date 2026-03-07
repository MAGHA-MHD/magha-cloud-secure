from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.models.schemas import StorageQuota, MessageResponse
from app.utils.security import get_current_user
from app.config import STORAGE_PLANS, PLAN_PRICES

router = APIRouter(prefix="/api/storage", tags=["Storage"])


@router.get("/quota", response_model=StorageQuota)
async def get_storage_quota(current_user: dict = Depends(get_current_user)):
    """Get storage quota for the current user."""
    storage_used = current_user["storage_used"]
    storage_limit = current_user["storage_limit"]
    usage_pct = (storage_used / storage_limit * 100) if storage_limit > 0 else 0

    return StorageQuota(
        plan=current_user["plan"],
        storage_used=storage_used,
        storage_limit=storage_limit,
        usage_percentage=round(usage_pct, 2),
        plan_price=PLAN_PRICES.get(current_user["plan"], 0),
    )


@router.post("/upgrade", response_model=MessageResponse)
async def upgrade_plan(plan: str, current_user: dict = Depends(get_current_user)):
    """Upgrade user storage plan."""
    if plan not in STORAGE_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan. Choose from: {', '.join(STORAGE_PLANS.keys())}",
        )

    new_limit = STORAGE_PLANS[plan]

    with get_db() as conn:
        conn.execute(
            "UPDATE users SET plan = ?, storage_limit = ? WHERE id = ?",
            (plan, new_limit, current_user["id"]),
        )

    return MessageResponse(
        message=f"Plan upgraded to '{plan}'. New storage limit: {new_limit // (1024*1024)} MB"
    )


@router.get("/plans")
async def list_plans():
    """List available storage plans."""
    plans = []
    for plan_name, storage_bytes in STORAGE_PLANS.items():
        if storage_bytes >= 1024 * 1024 * 1024:
            storage_display = f"{storage_bytes // (1024*1024*1024)} GB"
        else:
            storage_display = f"{storage_bytes // (1024*1024)} MB"

        plans.append({
            "name": plan_name,
            "storage": storage_display,
            "storage_bytes": storage_bytes,
            "price_eur": PLAN_PRICES[plan_name],
            "features": get_plan_features(plan_name),
        })
    return plans


def get_plan_features(plan: str) -> list[str]:
    """Get features for a plan."""
    base = ["Chiffrement AES-256", "Partage sécurisé"]
    if plan == "free":
        return base + ["500 Mo de stockage", "Support communautaire"]
    elif plan == "starter":
        return base + ["5 Go de stockage", "Support par email", "Authentification MFA"]
    elif plan == "pro":
        return base + ["50 Go de stockage", "Support prioritaire", "Authentification MFA", "Historique des versions"]
    elif plan == "enterprise":
        return base + ["500 Go de stockage", "Support dédié 24/7", "Authentification MFA", "Historique des versions", "API avancée"]
    return base
