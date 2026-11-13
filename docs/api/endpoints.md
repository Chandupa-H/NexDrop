# NexDrop API Specification (v1)

Base URL: `http://localhost:8000/api/v1`

FastAPI Interactive Docs: `http://localhost:8000/api/v1/docs`  
ReDoc: `http://localhost:8000/api/v1/redoc`

---

## 1. System Endpoints

### `GET /api/v1/health`
Returns system health status. Operates independently of database or message broker availability.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "NexDrop API",
  "version": "1.0.0",
  "environment": "development"
}
```

---

## 2. Pricing & Estimation Endpoints

### `POST /api/v1/pricing/estimate`
Calculates instant estimated shipping fares based on weight, distance, and chosen tier. Operates with built-in fallback constants if database is not connected.

**Request:**
```json
{
  "tier_name": "Standard",
  "distance_km": 15.5,
  "weight_kg": 2.0
}
```

**Response `200 OK`:**
```json
{
  "tier_name": "Standard",
  "distance_km": 15.5,
  "weight_kg": 2.0,
  "base_rate": 5.0,
  "distance_cost": 23.25,
  "weight_cost": 1.6,
  "total_price": 29.85
}
```

### `GET /api/v1/pricing/tiers`
Lists active pricing tiers (Standard, Express, SameDay).

---

## 3. Parcels Endpoints

### `GET /api/v1/parcels`
Lists paginated parcels.

### `POST /api/v1/parcels`
Registers a new delivery parcel with auto-generated `tracking_number` (format: `ND-XXXXXXXXXX`).

### `GET /api/v1/parcels/track/{tracking_number}`
Fetches status and delivery progress for a specific parcel.

### `PATCH /api/v1/parcels/{parcel_id}/status`
Updates shipment status (`pending`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `cancelled`).

---

## 4. Couriers & Dispatch Endpoints

### `GET /api/v1/couriers`
Lists registered couriers, optionally filtered by `available_only=true`.

### `PATCH /api/v1/couriers/{courier_id}/location`
Receives live GPS coordinates (`current_latitude`, `current_longitude`).

### `GET /api/v1/courier/deliveries`
Returns today's deliveries assigned to the authenticated courier. Requires a valid
Supabase bearer access token and configured `SUPABASE_URL` and `SUPABASE_JWT_SECRET`;
the courier identity is resolved from the token and cannot be supplied as a query
parameter. "Today" uses the `Asia/Colombo` timezone.

Repeat the optional `status` parameter to request multiple delivery statuses:

```text
/api/v1/courier/deliveries?status=picked_up&status=in_transit&status=out_for_delivery
```

Supported values are `pending`, `picked_up`, `in_transit`, `out_for_delivery`,
`delivered`, and `cancelled`. Results are ordered by `assigned_at` ascending.

### `POST /api/v1/dispatch`
Creates a new parcel-to-courier assignment.

### `PATCH /api/v1/dispatch/{assignment_id}/status`
Updates dispatch status (`assigned`, `accepted`, `rejected`, `completed`).

---

## 5. Real-Time Endpoints

### `WS /ws/{channel_id}`
WebSocket connection endpoint for live fleet GPS broadcasts and immediate customer delivery alerts.
