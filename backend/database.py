from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def normalize_database_url(raw_url: str) -> str:
    if raw_url.startswith('file:'):
        relative_path = raw_url.removeprefix('file:')
        database_path = (PROJECT_ROOT / relative_path).resolve()
        return f'sqlite:///{database_path}'

    if raw_url.startswith('sqlite://'):
        return raw_url

    return raw_url


DATABASE_URL = normalize_database_url(os.getenv('DATABASE_URL', 'file:./dev.db'))
connect_args = {'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, future=True)
Base = declarative_base()
