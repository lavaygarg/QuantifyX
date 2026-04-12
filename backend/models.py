from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = 'User'

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    emailVerified: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    passwordHash: Mapped[str | None] = mapped_column(String, nullable=True)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    portfolios = relationship('Portfolio', back_populates='user')
    transactions = relationship('Transaction', back_populates='user')


class Portfolio(Base):
    __tablename__ = 'Portfolio'

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(ForeignKey('User.id', ondelete='CASCADE'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, default='Main Portfolio')
    cashBalance: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    createdAt: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship('User', back_populates='portfolios')
    holdings = relationship('Holding', back_populates='portfolio', cascade='all, delete-orphan')


class Holding(Base):
    __tablename__ = 'Holding'

    id: Mapped[str] = mapped_column(String, primary_key=True)
    portfolioId: Mapped[str] = mapped_column(ForeignKey('Portfolio.id', ondelete='CASCADE'), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    averageCost: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    currentPrice: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    createdAt: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    portfolio = relationship('Portfolio', back_populates='holdings')


class Transaction(Base):
    __tablename__ = 'Transaction'

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(ForeignKey('User.id', ondelete='CASCADE'), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    side: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    user = relationship('User', back_populates='transactions')
