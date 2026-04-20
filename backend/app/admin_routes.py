"""Admin utility endpoints: demo data seed / clear.

Gated by superadmin role. Safe to expose in production — the clear endpoint
only removes rows created by the demo seeder (users with the demo email
domain, orders belonging to those users, and promo/metric rows tagged as
demo).
"""

from fastapi import APIRouter

from app.logger import get_logger
from app.seed_demo_data import clear_demo_data, seed_demo_data
from app.shared.auth import SuperAdminUser

logger = get_logger(__name__)

router = APIRouter(prefix="/admin/demo", tags=["Admin — Demo Data"])


@router.post("/seed", summary="Seed demo data (superadmin only)")
async def seed_demo(_: SuperAdminUser):
    counts = await seed_demo_data()
    return {"status": "ok", "seeded": counts}


@router.delete("/clear", summary="Clear demo data (superadmin only)")
async def clear_demo(_: SuperAdminUser):
    counts = await clear_demo_data()
    return {"status": "ok", "deleted": counts}
