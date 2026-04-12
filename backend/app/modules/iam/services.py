from datetime import datetime, timezone
from uuid import UUID

import bcrypt

from app.exceptions import BadRequestError, ConflictError, NotFoundError, UnauthorizedError
from app.modules.iam.models import Tenant, User
from app.modules.iam.repo import UserRepo
from app.modules.iam.schemas import RegisterRequest
from app.shared.auth import create_access_token, create_refresh_token, decode_token


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


class AuthService:
    def __init__(self, user_repo: UserRepo):
        self.user_repo = user_repo

    async def register(self, data: RegisterRequest, tenant: Tenant) -> tuple[User, str, str]:
        existing = await self.user_repo.get_by_email_and_tenant(data.email, tenant.id)
        if existing:
            raise ConflictError("User with this email already exists")

        user = User(
            tenant_id=tenant.id,
            email=data.email,
            hashed_password=get_password_hash(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
            role="customer",
        )
        user = await self.user_repo.create(user)

        access_token = create_access_token(user.id, role=user.role)
        refresh_token = create_refresh_token(user.id)
        return user, access_token, refresh_token

    async def login(self, email: str, password: str, tenant: Tenant) -> tuple[User, str, str]:
        user = await self.user_repo.get_by_email_and_tenant(email, tenant.id)
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Account is not active")

        await self.user_repo.update(user.id, last_login_at=datetime.now(timezone.utc))

        access_token = create_access_token(user.id, role=user.role)
        refresh_token = create_refresh_token(user.id)
        return user, access_token, refresh_token

    async def refresh(self, refresh_token_str: str) -> tuple[str, str]:
        payload = decode_token(refresh_token_str)
        if payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid token type")

        user_id = UUID(payload["sub"])
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UnauthorizedError("User not found")

        access_token = create_access_token(user.id, role=user.role)
        new_refresh = create_refresh_token(user.id)
        return access_token, new_refresh


class UserService:
    def __init__(self, user_repo: UserRepo):
        self.user_repo = user_repo

    async def get_by_id(self, user_id: UUID) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        return user

    async def update_profile(self, user_id: UUID, **kwargs) -> User:
        user = await self.user_repo.update(user_id, **{k: v for k, v in kwargs.items() if v is not None})
        if not user:
            raise NotFoundError("User not found")
        return user

    async def list_users(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 20,
        is_active: bool | None = None,
        role: str | None = None,
    ) -> tuple[list[User], int]:
        return await self.user_repo.list_by_tenant(tenant_id, offset, limit, is_active, role)

    async def create_user(
        self,
        tenant_id: UUID,
        email: str,
        first_name: str,
        last_name: str,
        password: str,
        role: str = "admin",
        phone: str | None = None,
    ) -> User:
        existing = await self.user_repo.get_by_email_and_tenant(email, tenant_id)
        if existing:
            raise ConflictError("User with this email already exists")
        user = User(
            tenant_id=tenant_id,
            email=email,
            hashed_password=get_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=role,
            is_active=True,
        )
        return await self.user_repo.create(user)

    async def delete_user(self, user_id: UUID) -> None:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        if user.is_active:
            raise BadRequestError("User must be deactivated before permanent deletion")
        await self.user_repo.delete(user_id)

    async def deactivate(self, user_id: UUID) -> User:
        user = await self.user_repo.update(user_id, is_active=False)
        if not user:
            raise NotFoundError("User not found")
        return user
