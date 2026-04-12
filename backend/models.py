from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator, BigInteger

from database import Base
import os

_IS_POSTGRES = os.getenv('BACKEND_DATABASE_URL', '').startswith('postgres')

class SQLitePrismaDateTime(TypeDecorator):
    impl = BigInteger
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, datetime):
            return int(value.timestamp() * 1000)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000.0, tz=timezone.utc).replace(tzinfo=None)
        if isinstance(value, str):
            if value.endswith('Z'):
                value = value[:-1] + '+00:00'
            try:
                return datetime.fromisoformat(value).replace(tzinfo=None)
            except ValueError:
                pass
        return value

PrismaDateTime = DateTime if _IS_POSTGRES else SQLitePrismaDateTime



class User(Base):
    __tablename__ = 'User'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    emailVerified: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    passwordHash: Mapped[str | None] = mapped_column(String, nullable=True)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    portfolios = relationship('Portfolio', back_populates='user')
    transactions = relationship('Transaction', back_populates='user')


class Portfolio(Base):
    __tablename__ = 'Portfolio'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId: Mapped[str] = mapped_column(ForeignKey('User.id', ondelete='CASCADE'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, default='Main Portfolio')
    cashBalance: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='portfolios')
    holdings = relationship('Holding', back_populates='portfolio', cascade='all, delete-orphan')


class Holding(Base):
    __tablename__ = 'Holding'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    portfolioId: Mapped[str] = mapped_column(ForeignKey('Portfolio.id', ondelete='CASCADE'), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    averageCost: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    currentPrice: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    portfolio = relationship('Portfolio', back_populates='holdings')


class Transaction(Base):
    __tablename__ = 'Transaction'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId: Mapped[str] = mapped_column(ForeignKey('User.id', ondelete='CASCADE'), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    side: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='transactions')
