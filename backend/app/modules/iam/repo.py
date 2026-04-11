from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.iam.models import Tenant, User


class TenantRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, tenant_id: UUID) -> Tenant | None:
        result = await self.db.execute(select(Tenant).where(Tenant.id == tenant_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Tenant | None:
        result = await self.db.execute(select(Tenant).where(Tenant.slug == slug))
        return result.scalar_one_or_none()

    async def create(self, tenant: Tenant) -> Tenant:
        self.db.add(tenant)
        await self.db.flush()
        return tenant


class UserRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email_and_tenant(self, email: str, tenant_id: UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email, User.tenant_id == tenant_id))
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    async def update(self, user_id: UUID, **kwargs) -> User | None:
        await self.db.execute(update(User).where(User.id == user_id).values(**kwargs))
        return await self.get_by_id(user_id)

    async def delete(self, user_id: UUID) -> bool:
        user = await self.get_by_id(user_id)
        if user:
            await self.db.delete(user)
            await self.db.flush()
            return True
        return False

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 20,
        is_active: bool | None = None,
        role: str | None = None,
    ) -> tuple[list[User], int]:
        query = select(User).where(User.tenant_id == tenant_id)
        count_query = select(func.count()).select_from(User).where(User.tenant_id == tenant_id)

        if is_active is not None:
            query = query.where(User.is_active == is_active)
            count_query = count_query.where(User.is_active == is_active)

        if role is not None:
            query = query.where(User.role == role)
            count_query = count_query.where(User.role == role)

        query = query.offset(offset).limit(limit).order_by(User.created_at.desc())

        result = await self.db.execute(query)
        count_result = await self.db.execute(count_query)
        return list(result.scalars().all()), count_result.scalar_one()
