from typing import Optional, List
from app.modules.couriers.models import Courier
from app.modules.couriers.schemas import CourierCreate, CourierLocationUpdate, CourierRegistrationRequest
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.models import CourierApprovalStatus
from app.modules.users.models import User, UserRole
from app.modules.auth.service import AuthService


class CourierService:
    def __init__(self, repository: CourierRepository):
        self.repository = repository

    async def get_courier(self, courier_id: int) -> Optional[Courier]:
        return await self.repository.get_by_id(courier_id)

    async def list_available(self) -> List[Courier]:
        return await self.repository.list_available()

    async def list_couriers(self, skip: int = 0, limit: int = 100) -> List[Courier]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def create_courier(self, payload: CourierCreate) -> Courier:
        courier = Courier(
            user_id=payload.user_id,
            vehicle_type=payload.vehicle_type,
            license_plate=payload.license_plate,
            is_available=payload.is_available,
        )
        return await self.repository.create(courier)

    async def register_courier(self, payload: CourierRegistrationRequest, documents: dict[str, str]) -> Courier:
        email = str(payload.email).lower()
        if await self.repository.get_user_by_email(email):
            raise ValueError("An account with this email address already exists.")
        if await self.repository.get_by_nic(payload.nic_number):
            raise ValueError("An application with this NIC number already exists.")
        if await self.repository.get_by_phone(payload.phone):
            raise ValueError("An application with this mobile number already exists.")

        user = User(
            email=email,
            full_name=payload.full_name,
            hashed_password=AuthService.hash_password(payload.password),
            role=UserRole.COURIER,
            is_active=False,
        )
        self.repository.session.add(user)
        await self.repository.session.flush()
        courier = Courier(
            user_id=user.id,
            vehicle_type=payload.vehicle_type,
            license_plate=payload.license_plate,
            is_available=False,
            date_of_birth=payload.date_of_birth,
            gender=payload.gender,
            nic_number=payload.nic_number,
            nationality=payload.nationality,
            phone=payload.phone,
            alternative_phone=payload.alternative_phone,
            residential_address=payload.residential_address,
            city=payload.city,
            district=payload.district,
            postal_code=payload.postal_code,
            vehicle_brand=payload.vehicle_brand,
            vehicle_model=payload.vehicle_model,
            vehicle_color=payload.vehicle_color,
            vehicle_year=payload.vehicle_year,
            driving_licence_number=payload.driving_licence_number,
            driving_licence_expiry=payload.driving_licence_expiry,
            emergency_contact_name=payload.emergency_contact_name,
            emergency_contact_relationship=payload.emergency_contact_relationship,
            emergency_contact_phone=payload.emergency_contact_phone,
            document_files=documents,
            approval_status=CourierApprovalStatus.PENDING,
        )
        return await self.repository.create(courier)

    async def update_location(self, courier_id: int, payload: CourierLocationUpdate) -> Optional[Courier]:
        courier = await self.repository.get_by_id(courier_id)
        if not courier:
            return None
        courier.current_latitude = payload.current_latitude
        courier.current_longitude = payload.current_longitude
        await self.repository.session.flush()
        return courier
