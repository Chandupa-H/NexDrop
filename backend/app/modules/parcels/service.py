from typing import Optional, List
import uuid
from app.modules.parcels.models import Parcel, ParcelStatus
from app.modules.parcels.schemas import ParcelCreate, ParcelStatusUpdate
from app.modules.parcels.repository import ParcelRepository


class ParcelService:
    def __init__(self, repository: ParcelRepository):
        self.repository = repository

    async def get_parcel(self, parcel_id: int) -> Optional[Parcel]:
        return await self.repository.get_by_id(parcel_id)

    async def track_parcel(self, tracking_number: str) -> Optional[Parcel]:
        return await self.repository.get_by_tracking_number(tracking_number)

    async def list_parcels(self, skip: int = 0, limit: int = 100) -> List[Parcel]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def create_parcel(self, payload: ParcelCreate) -> Parcel:
        tracking_prefix = "ND"
        tracking_code = uuid.uuid4().hex[:10].upper()
        tracking_number = f"{tracking_prefix}-{tracking_code}"

        parcel = Parcel(
            tracking_number=tracking_number,
            sender_id=payload.sender_id,
            recipient_name=payload.recipient_name,
            recipient_phone=payload.recipient_phone,
            delivery_address=payload.delivery_address,
            delivery_city=payload.delivery_city,
            weight_kg=payload.weight_kg,
            dimensions=payload.dimensions,
            status=ParcelStatus.PENDING,
            special_instructions=payload.special_instructions,
        )
        return await self.repository.create(parcel)

    async def update_status(self, parcel_id: int, payload: ParcelStatusUpdate) -> Optional[Parcel]:
        parcel = await self.repository.get_by_id(parcel_id)
        if not parcel:
            return None
        parcel.status = payload.status
        await self.repository.session.flush()
        return parcel
