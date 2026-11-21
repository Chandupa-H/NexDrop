import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text


def test_supabase_mapping_migration_preserves_existing_users():
    migration_path = (
        Path(__file__).parents[1]
        / "migrations"
        / "versions"
        / "g1h2i3j4k5l6_add_supabase_user_id.py"
    )
    spec = importlib.util.spec_from_file_location("supabase_user_mapping_migration", migration_path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE users ("
                "id INTEGER PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE)"
            )
        )
        connection.execute(
            text("INSERT INTO users (id, email) VALUES (1, 'existing@example.com')")
        )

        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()

        columns = {column["name"]: column for column in inspect(connection).get_columns("users")}
        indexes = {
            index["name"]: index
            for index in inspect(connection).get_indexes("users")
        }
        existing_user = connection.execute(
            text("SELECT id, email, supabase_user_id FROM users WHERE id = 1")
        ).one()

    assert columns["supabase_user_id"]["nullable"] is True
    assert indexes["uq_users_supabase_user_id"]["unique"] == 1
    assert tuple(existing_user) == (1, "existing@example.com", None)
    engine.dispose()
