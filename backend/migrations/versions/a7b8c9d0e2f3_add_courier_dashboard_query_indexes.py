"""Add indexes used by courier dashboard queries."""
from typing import Sequence, Union

from alembic import op


revision: str = "a7b8c9d0e2f3"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_dispatch_assignment_courier_parcel_assigned",
        "dispatch_assignments",
        ["courier_id", "parcel_id", "assigned_at"],
    )
    op.create_index(
        "ix_parcel_status_history_parcel_status_occurred",
        "parcel_status_history",
        ["parcel_id", "status", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_parcel_status_history_parcel_status_occurred",
        table_name="parcel_status_history",
    )
    op.drop_index(
        "ix_dispatch_assignment_courier_parcel_assigned",
        table_name="dispatch_assignments",
    )
