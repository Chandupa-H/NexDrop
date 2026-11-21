"""Add stable Supabase subject mapping to backend users."""
from alembic import op
import sqlalchemy as sa


revision = "g1h2i3j4k5l6"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
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


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade would discard Supabase subject mappings; export and reconcile "
        "those mappings before removing this column."
    )
