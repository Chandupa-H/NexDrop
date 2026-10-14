# NexDrop Module Reference Guide

This document defines the 10 internal modules comprising the NexDrop Modular Monolith backend.

---

## 1. Auth Module (`app/modules/auth`)
- **Purpose:** User authentication, token issuance, and session validation.
- **Technologies:** JWT, Argon2 password hashing (planned), Google OAuth 2.0 (planned).
- **Key Schemas:** `LoginRequest`, `TokenSchema`, `TokenPayload`.
- **Files:** `schemas.py`, `service.py`, `routes.py`, `__init__.py`.

---

## 2. Users Module (`app/modules/users`)
- **Purpose:** Core identity and user account lifecycle.
- **Roles:** `admin`, `customer`, `merchant`, `courier`, `dispatcher`.
- **Key Entity:** `User` (email, full_name, hashed_password, role, is_active).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.

---

## 3. Customers Module (`app/modules/customers`)
- **Purpose:** Consumer profile, saved shipping addresses, and preferences.
- **Key Entity:** `Customer` (user_id FK, phone, default_address, city, postal_code).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.

---

## 4. Merchants Module (`app/modules/merchants`)
- **Purpose:** Enterprise & retail merchant accounts, business registries, and external API key credentials.
- **Key Entity:** `Merchant` (user_id FK, business_name, registration_number, contact_phone, business_address, api_key).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.

---

## 5. Couriers Module (`app/modules/couriers`)
- **Purpose:** Driver telemetry, vehicle profiles, and live coordinate tracking.
- **Key Entity:** `Courier` (user_id FK, vehicle_type, license_plate, current_latitude, current_longitude, is_available).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.

---

## 6. Parcels Module (`app/modules/parcels`)
- **Purpose:** Package lifecycle, barcode tracking IDs, dimensions, weights, and transit states.
- **States:** `pending` -> `picked_up` -> `in_transit` -> `out_for_delivery` -> `delivered` / `cancelled`.
- **Key Entity:** `Parcel` (tracking_number, sender_id, recipient_name, recipient_phone, delivery_address, delivery_city, weight_kg, status).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.

---

## 7. Dispatch Module (`app/modules/dispatch`)
- **Purpose:** Automated and manual courier-to-parcel assignment engine.
- **Key Entity:** `DispatchAssignment` (parcel_id FK, courier_id FK, status, assigned_at, completed_at, notes).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.

---

## 8. Pricing Module (`app/modules/pricing`)
- **Purpose:** Algorithmic fare calculation based on distance, weight, and delivery priority tiers.
- **Key Entity:** `PricingTier` (name, base_rate, per_km_rate, per_kg_rate, is_active).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.

---

## 9. Notifications Module (`app/modules/notifications`)
- **Purpose:** User alert dispatching across SMS, Email, In-App, and Push notification channels.
- **Key Entity:** `Notification` (user_id, title, message, channel, is_read).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.

---

## 10. Webhooks Module (`app/modules/webhooks`)
- **Purpose:** Event subscription and callback dispatching for integrated merchant storefronts.
- **Key Entity:** `WebhookSubscription` (merchant_id, target_url, event_type, secret_token, is_active).
- **Files:** `models.py`, `schemas.py`, `repository.py`, `service.py`, `routes.py`.
