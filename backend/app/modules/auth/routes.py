from fastapi import APIRouter, HTTPException, status
from app.modules.auth.schemas import LoginRequest, TokenSchema

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenSchema, summary="User login endpoint (Planned)")
async def login(payload: LoginRequest):
    """
    Authenticate user with credentials and return JWT bearer token.
    (Scheduled for authentication milestone).
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication logic is scheduled for implementation in the Auth feature milestone.",
    )
