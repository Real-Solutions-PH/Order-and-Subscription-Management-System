"""Payment Processing domain models."""

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.models import Base, TimestampMixin, TenantMixin, UUIDPrimaryKeyMixin


# ── Enums ───────────────────────────────────────────────────────────────

class PaymentMethodType(str, enum.Enum):
    CARD = "card"
    GCASH = "gcash"
    MAYA = "maya"
    GRABPAY = "grabpay"
    QR_PH = "qr_ph"
    OTC = "otc"
    COD = "cod"
    WALLET = "wallet"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    AWAITING_METHOD = "awaiting_method"
    AWAITING_ACTION = "awaiting_action"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    PENDING_COLLECTION = "pending_collection"


class PaymentChannel(str, enum.Enum):
    PAYMONGO = "paymongo"
    COD = "cod"
    WALLET = "wallet"


class TransactionType(str, enum.Enum):
    INTENT_CREATED = "intent_created"
    METHOD_ATTACHED = "method_attached"
    AWAITING_ACTION = "awaiting_action"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    REFUND_UPDATED = "refund_updated"
    COD_COLLECTED = "cod_collected"


class TransactionStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    VOID = "void"


class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"


# ── Payment Method ──────────────────────────────────────────────────────

class PaymentMethod(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "payment_methods"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    type: Mapped[PaymentMethodType] = mapped_column(
        Enum(PaymentMethodType, name="payment_method_type", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    paymongo_method_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_four: Mapped[str | None] = mapped_column(String(4), nullable=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_brand: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)


# ── Payment ─────────────────────────────────────────────────────────────

class Payment(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    payment_method_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="PHP")
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    payment_channel: Mapped[PaymentChannel] = mapped_column(
        Enum(PaymentChannel, name="payment_channel", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    paymongo_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paymongo_payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paymongo_checkout_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    checkout_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # relationships
    transactions: Mapped[list["PaymentTransaction"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan", lazy="selectin",
        order_by="PaymentTransaction.created_at",
    )


# ── Payment Transaction ─────────────────────────────────────────────────

class PaymentTransaction(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "payment_transactions"

    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, name="transaction_type", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus, name="transaction_status", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    paymongo_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paymongo_resource_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paymongo_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    payment_method_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fee_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    net_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationships
    payment: Mapped["Payment"] = relationship(back_populates="transactions")


# ── Invoice ─────────────────────────────────────────────────────────────

class Invoice(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "invoices"

    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    invoice_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
        default=InvoiceStatus.DRAFT,
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="PHP")
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # relationships
    line_items: Mapped[list["InvoiceLineItem"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan", lazy="selectin"
    )


class InvoiceLineItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "invoice_line_items"

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="line_items")


# ── Promo Code ──────────────────────────────────────────────────────────

class PromoCode(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "promo_codes"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_promo_codes_tenant_code"),
    )

    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, name="discount_type", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    discount_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    min_order_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    max_discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    per_user_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_order_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # relationships
    usages: Mapped[list["PromoCodeUsage"]] = relationship(
        back_populates="promo_code", cascade="all, delete-orphan", lazy="selectin"
    )


class PromoCodeUsage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "promo_code_usages"

    promo_code_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("promo_codes.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    discount_applied: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationships
    promo_code: Mapped["PromoCode"] = relationship(back_populates="usages")
