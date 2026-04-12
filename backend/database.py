from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PRISMA_DIR = PROJECT_ROOT / 'frontend' / 'prisma'


def normalize_database_url(raw_url: str, base_dir: Path) -> str:
    if raw_url.startswith('file:'):
        relative_path = raw_url.removeprefix('file:')
        database_path = (base_dir / relative_path).resolve()
        return f'sqlite:///{database_path}'

    if raw_url.startswith('sqlite://'):
        return raw_url

    return raw_url


raw_backend_database_url = os.getenv('BACKEND_DATABASE_URL')
if raw_backend_database_url:
    DATABASE_URL = normalize_database_url(raw_backend_database_url, PROJECT_ROOT)
else:
    # Prisma resolves file: paths relative to schema.prisma (./prisma directory).
    DATABASE_URL = normalize_database_url(os.getenv('DATABASE_URL', 'file:./dev.db'), PRISMA_DIR)

connect_args = {'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, future=True)
Base = declarative_base()
