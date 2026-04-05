"""Payment processing repository classes."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.repo.base import BaseRepository
from app.repo.db import (
    Invoice,
    Payment,
    PaymentMethod,
    PaymentStatus,
    PaymentTransaction,
    PromoCode,
    PromoCodeUsage,
)


class PaymentMethodRepository(BaseRepository[PaymentMethod]):
    """Repository for saved payment method operations."""

    model = PaymentMethod

    async def get_by_user(self, user_id: UUID | str, tenant_id: UUID | str) -> list[PaymentMethod]:
        """Return all saved payment methods for a user."""
        stmt = (
            select(PaymentMethod)
            .where(
                PaymentMethod.user_id == user_id,
                PaymentMethod.tenant_id == tenant_id,
            )
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_default(self, user_id: UUID | str, tenant_id: UUID | str) -> PaymentMethod | None:
        """Return the user's default payment method, if any."""
        stmt = select(PaymentMethod).where(
            PaymentMethod.user_id == user_id,
            PaymentMethod.tenant_id == tenant_id,
            PaymentMethod.is_default.is_(True),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class PaymentRepository(BaseRepository[Payment]):
    """Repository for payment record operations."""

    model = Payment

    async def get_by_order(self, order_id: UUID | str) -> Payment | None:
        """Get the payment associated with an order."""
        stmt = select(Payment).where(Payment.order_id == order_id).options(selectinload(Payment.transactions))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_intent(self, paymongo_intent_id: str) -> Payment | None:
        """Look up a payment by its PayMongo intent ID."""
        stmt = select(Payment).where(Payment.paymongo_intent_id == paymongo_intent_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_pending_retries(self) -> list[Payment]:
        """Return payments that are due for a retry attempt."""
        stmt = (
            select(Payment)
            .where(
                Payment.status == PaymentStatus.failed,
                Payment.next_retry_at.isnot(None),
            )
            .order_by(Payment.next_retry_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class PaymentTransactionRepository(BaseRepository[PaymentTransaction]):
    """Repository for payment transaction log entries."""

    model = PaymentTransaction

    async def get_by_payment(self, payment_id: UUID | str) -> list[PaymentTransaction]:
        """Return all transactions for a payment, ordered chronologically."""
        stmt = (
            select(PaymentTransaction)
            .where(PaymentTransaction.payment_id == payment_id)
            .order_by(PaymentTransaction.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def check_idempotency(self, paymongo_event_id: str) -> bool:
        """Return True if this PayMongo event has already been processed."""
        stmt = select(
            select(PaymentTransaction).where(PaymentTransaction.paymongo_event_id == paymongo_event_id).exists()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()


class InvoiceRepository(BaseRepository[Invoice]):
    """Repository for invoice operations."""

    model = Invoice

    async def get_by_order(self, order_id: UUID | str) -> Invoice | None:
        """Get the invoice for a specific order."""
        stmt = select(Invoice).where(Invoice.order_id == order_id).options(selectinload(Invoice.line_items))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_tenant(
        self,
        tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Invoice]:
        """Return paginated invoices for a tenant."""
        stmt = (
            select(Invoice)
            .where(Invoice.tenant_id == tenant_id)
            .options(selectinload(Invoice.line_items))
            .order_by(Invoice.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_tenant(self, tenant_id: UUID | str) -> int:
        """Count invoices for a tenant."""
        stmt = select(func.count()).select_from(Invoice).where(Invoice.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def generate_invoice_number(self, tenant_id: UUID | str) -> str:
        """Generate the next sequential invoice number.

        Format: ``INV-XXXXXX`` where X is a zero-padded sequential number.
        """
        stmt = select(func.count()).select_from(Invoice).where(Invoice.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        count = result.scalar_one()
        return f"INV-{count + 1:06d}"


class PromoCodeRepository(BaseRepository[PromoCode]):
    """Repository for promo code operations."""

    model = PromoCode

    async def get_by_code(self, code: str, tenant_id: UUID | str) -> PromoCode | None:
        """Look up an active promo code by its code string."""
        stmt = select(PromoCode).where(
            PromoCode.code == code,
            PromoCode.tenant_id == tenant_id,
            PromoCode.is_active.is_(True),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def validate_usage(self, code_id: UUID | str, user_id: UUID | str) -> bool:
        """Check whether the user can still use this promo code.

        Returns True if usage is within limits, False otherwise.
        """
        promo = await self.get_by_id(code_id)
        if promo is None:
            return False

        # Global usage limit
        if promo.usage_limit is not None:
            total_stmt = select(func.count()).select_from(PromoCodeUsage).where(PromoCodeUsage.promo_code_id == code_id)
            total = (await self.session.execute(total_stmt)).scalar_one()
            if total >= promo.usage_limit:
                return False

        # Per-user limit
        if promo.per_user_limit is not None:
            user_stmt = (
                select(func.count())
                .select_from(PromoCodeUsage)
                .where(
                    PromoCodeUsage.promo_code_id == code_id,
                    PromoCodeUsage.user_id == user_id,
                )
            )
            user_count = (await self.session.execute(user_stmt)).scalar_one()
            if user_count >= promo.per_user_limit:
                return False

        return True
