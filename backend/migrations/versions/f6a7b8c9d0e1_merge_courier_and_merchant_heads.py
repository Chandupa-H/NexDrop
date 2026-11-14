"""Merge the courier data and merchant API migration branches."""
from typing import Sequence, Union


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = (
    "e5f6a7b8c9d0",
    "b2c3d4e5f6a7",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
