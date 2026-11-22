"""Remove the unused Supabase subject mapping from backend users.

The application resolves users by email again, so the column and unique index
added by g1h2i3j4k5l6 are no longer needed. This is a NEW forward migration:
g1h2i3j4k5l6 stays in the history because the shared database already applied it.
"""
from alembic import op
import sqlalchemy as sa


revision = "h2i3j4k5l6m7"
down_revision = "g1h2i3j4k5l6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_supabase_user_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS supabase_user_id")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("supabase_user_id", sa.Uuid(as_uuid=True), nullable=True),
    )
    op.create_index(
        "uq_users_supabase_user_id",
        "users",
        ["supabase_user_id"],
        unique=True,
    )
