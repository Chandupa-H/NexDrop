"""Merge the customer addresses branch into the main migration chain.

After this revision the project has a single head again.
"""
from typing import Sequence, Union


revision: str = "i3j4k5l6m7n8"
down_revision: Union[str, Sequence[str], None] = (
    "h2i3j4k5l6m7",
    "c1d2e3f4a5b6",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
