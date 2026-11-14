"""Isolated account tests. Never load backend/tests/conftest.py or app.main.

Process-only overrides are set BEFORE application imports. There is no database
engine, external auth provider, lifespan hook, or real HTTP transport in this suite.
"""
import os

os.environ["DATABASE_URL"] = ""
os.environ["DEBUG"] = "false"
os.environ["RABBITMQ_ENABLED"] = "false"

import pytest
import sqlalchemy.ext.asyncio
from app.db import session as database


@pytest.fixture(autouse=True)
def prohibit_database_access(monkeypatch):
    assert not database.settings.DATABASE_URL

    def forbidden(*args, **kwargs):
        pytest.fail("Account unit tests attempted database engine/session access")

    monkeypatch.setattr(sqlalchemy.ext.asyncio, "create_async_engine", forbidden)
    monkeypatch.setattr(database, "get_engine", forbidden)
    monkeypatch.setattr(database, "get_session_factory", forbidden)
