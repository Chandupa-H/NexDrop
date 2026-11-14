from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
import random
from app.modules.customers.models import Customer, CustomerAddress
from app.modules.parcels.models import Parcel, ParcelStatus
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerCreateParcelRequest,
    CustomerAddressCreate,
    CustomerAddressUpdate,
)
from app.modules.customers.repository import CustomerRepository


class CustomerService:
    def __init__(self, repository: CustomerRepository):
        self.repository = repository

    async def get_customer(self, customer_id: int) -> Optional[Customer]:
        return await self.repository.get_by_id(customer_id)

    async def get_by_user(self, user_id: int) -> Optional[Customer]:
        return await self.repository.get_by_user_id(user_id)

    async def list_customers(self, skip: int = 0, limit: int = 100) -> List[Customer]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def create_customer(self, payload: CustomerCreate) -> Customer:
        customer = Customer(
            user_id=payload.user_id,
            phone=payload.phone,
            default_address=payload.default_address,
            city=payload.city,
            postal_code=payload.postal_code,
            notes=payload.notes,
        )
        return await self.repository.create(customer)

    # ── Profile & Dashboard ──
    async def get_profile(self, user_id: int) -> Optional[Dict[str, Any]]:
        return await self.repository.get_customer_profile(user_id)

    async def update_profile(self, user_id: int, values: Dict[str, str]) -> Optional[Dict[str, Any]]:
        try:
            return await self.repository.update_customer_profile(user_id, values)
        except Exception:
            await self.repository.session.rollback()
            raise

    async def get_dashboard_summary(self, sender_id: int = 1) -> Dict[str, Any]:
        return await self.repository.get_dashboard_summary(sender_id)

    # ── Parcels ──
    async def list_parcels(
        self,
        sender_id: int = 1,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Parcel], int]:
        return await self.repository.get_parcels(
            sender_id=sender_id, status=status, limit=limit, offset=offset
        )

    async def get_parcel(self, tracking_number: str) -> Optional[Parcel]:
        return await self.repository.get_parcel_by_tracking(tracking_number)

    async def create_parcel(
        self,
        payload: CustomerCreateParcelRequest,
        sender_id: int = 1,
    ) -> Parcel:
        tracking_number = f"NXD-CUS-{random.randint(10000, 99999)}"
        parcel = Parcel(
            tracking_number=tracking_number,
            sender_id=sender_id,
            recipient_name=payload.recipient_name,
            recipient_phone=payload.recipient_phone,
            delivery_address=payload.delivery_address,
            delivery_city=payload.delivery_city,
            weight_kg=payload.weight_kg,
            dimensions=payload.dimensions or "20 x 15 x 10 cm",
            status=ParcelStatus.PENDING,
            special_instructions=payload.special_instructions,
        )
        return await self.repository.create_parcel(parcel)

    async def cancel_parcel(self, tracking_number: str) -> Optional[Parcel]:
        return await self.repository.cancel_parcel(tracking_number)

    # ── Saved Addresses ──
    async def list_addresses(
        self,
        customer_id: int = 1,
        address_type: Optional[str] = None,
    ) -> List[CustomerAddress]:
        return await self.repository.list_addresses(customer_id, address_type)

    async def get_address(
        self,
        address_id: int,
        customer_id: int = 1,
    ) -> Optional[CustomerAddress]:
        return await self.repository.get_address(address_id, customer_id)

    async def create_address(
        self,
        payload: CustomerAddressCreate,
        customer_id: int = 1,
    ) -> CustomerAddress:
        address = CustomerAddress(
            customer_id=customer_id,
            address_type=payload.address_type,
            label=payload.label,
            custom_name=payload.custom_name,
            address=payload.address,
            city=payload.city,
            postal_code=payload.postal_code,
            contact_name=payload.contact_name,
            phone=payload.phone,
            is_default=payload.is_default,
        )
        return await self.repository.create_address(address)

    async def update_address(
        self,
        address_id: int,
        payload: CustomerAddressUpdate,
        customer_id: int = 1,
    ) -> Optional[CustomerAddress]:
        return await self.repository.update_address(
            address_id,
            customer_id,
            payload.model_dump(exclude_unset=True),
        )

    async def delete_address(
        self,
        address_id: int,
        customer_id: int = 1,
    ) -> bool:
        return await self.repository.delete_address(address_id, customer_id)

    async def set_default_address(
        self,
        address_id: int,
        customer_id: int = 1,
    ) -> Optional[CustomerAddress]:
        return await self.repository.set_default_address(address_id, customer_id)
