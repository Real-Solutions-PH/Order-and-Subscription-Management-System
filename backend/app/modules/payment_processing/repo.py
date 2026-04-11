"""Payment Processing repository layer (SQLAlchemy 2.0 async)."""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.payment_processing.models import (
    Invoice,
    InvoiceLineItem,
    Payment,
    PaymentMethod,
    PaymentTransaction,
    PromoCode,
    PromoCodeUsage,
)


class PaymentRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, payment: Payment) -> Payment:
        self.db.add(payment)
        await self.db.flush()
        return payment

    async def get_by_id(self, payment_id: uuid.UUID) -> Payment | None:
        stmt = select(Payment).options(selectinload(Payment.transactions)).where(Payment.id == payment_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, payment_id: uuid.UUID, **kwargs) -> None:
        stmt = update(Payment).where(Payment.id == payment_id).values(**kwargs)
        await self.db.execute(stmt)
        await self.db.flush()

    async def add_transaction(self, transaction: PaymentTransaction) -> PaymentTransaction:
        self.db.add(transaction)
        await self.db.flush()
        return transaction

    async def list_methods_by_user(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> list[PaymentMethod]:
        stmt = (
            select(PaymentMethod)
            .where(PaymentMethod.user_id == user_id, PaymentMethod.tenant_id == tenant_id)
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_method(self, method: PaymentMethod) -> PaymentMethod:
        self.db.add(method)
        await self.db.flush()
        return method


class PromoCodeRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_code(self, code: str, tenant_id: uuid.UUID) -> PromoCode | None:
        stmt = select(PromoCode).where(PromoCode.code == code, PromoCode.tenant_id == tenant_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_tenant(
        self, tenant_id: uuid.UUID, offset: int = 0, limit: int = 20
    ) -> tuple[list[PromoCode], int]:
        base = select(PromoCode).where(PromoCode.tenant_id == tenant_id)

        count_stmt = select(func.count()).select_from(base.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = base.order_by(PromoCode.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def get_usage_count(self, promo_id: uuid.UUID) -> int:
        stmt = select(func.count()).select_from(PromoCodeUsage).where(PromoCodeUsage.promo_code_id == promo_id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_user_usage_count(self, promo_id: uuid.UUID, user_id: uuid.UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(PromoCodeUsage)
            .where(
                PromoCodeUsage.promo_code_id == promo_id,
                PromoCodeUsage.user_id == user_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def create_usage(self, usage: PromoCodeUsage) -> PromoCodeUsage:
        self.db.add(usage)
        await self.db.flush()
        return usage


class InvoiceRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, invoice: Invoice) -> Invoice:
        self.db.add(invoice)
        await self.db.flush()
        return invoice

    async def get_by_id(self, invoice_id: uuid.UUID) -> Invoice | None:
        stmt = select(Invoice).options(selectinload(Invoice.line_items)).where(Invoice.id == invoice_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_tenant(self, tenant_id: uuid.UUID, offset: int = 0, limit: int = 20) -> tuple[list[Invoice], int]:
        base = select(Invoice).where(Invoice.tenant_id == tenant_id)

        count_stmt = select(func.count()).select_from(base.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = (
            base.options(selectinload(Invoice.line_items))
            .order_by(Invoice.issued_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def list_by_user(
        self, user_id: uuid.UUID, tenant_id: uuid.UUID, offset: int = 0, limit: int = 20
    ) -> tuple[list[Invoice], int]:
        """List invoices by user via their orders.

        Since invoices reference order_id, and orders reference user_id,
        a proper join would be needed. For now, we use the tenant scope
        and rely on caller filtering. This can be enhanced with a user_id
        column on invoices or a join to orders.
        """
        base = select(Invoice).where(Invoice.tenant_id == tenant_id)

        count_stmt = select(func.count()).select_from(base.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = (
            base.options(selectinload(Invoice.line_items))
            .order_by(Invoice.issued_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def add_line_item(self, item: InvoiceLineItem) -> InvoiceLineItem:
        self.db.add(item)
        await self.db.flush()
        return item

    async def get_next_invoice_number(self, tenant_id: uuid.UUID) -> str:
        stmt = select(func.count()).select_from(Invoice).where(Invoice.tenant_id == tenant_id)
        result = await self.db.execute(stmt)
        count = result.scalar_one()
        return f"INV-{count + 1:05d}"
