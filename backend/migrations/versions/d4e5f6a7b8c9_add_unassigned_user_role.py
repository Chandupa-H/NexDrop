"""Add an unassigned role for imported authentication accounts."""
from alembic import op

revision = "d4e5f6a7b8c9"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade():
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'UNASSIGNED'")


def downgrade():
    # PostgreSQL cannot remove an enum value without rebuilding the type.
    # Keep it so existing imported accounts remain readable.
    pass
