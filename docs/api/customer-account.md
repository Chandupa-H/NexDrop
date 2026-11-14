# Customer account reliability — Chunk 4B

`GET`, `PUT`, and `DELETE /api/v1/customers/customer/me` require the customer-specific
`get_verified_customer_profile_identity` dependency. It currently always returns
503 before a database session is opened. No production request parameter, header,
environment flag or fallback can select a legacy user identity.

Platform integration must provide a verified, active customer principal and a
trusted mapping from the Supabase UUID to the legacy integer User ID. This chunk
does not implement that mapping, token validation, login or shared RBAC.

With that dependency integrated, reads return stored User/Customer values or 404.
Updates accept only `full_name` (2–150), `phone` (7–30), `default_address` (3–255),
`city` (2–100), and `postal_code` (3–20 characters). Strings are trimmed. Omitted
fields remain unchanged; null, empty updates, unknown fields and protected identity,
email/role fields produce 422. Commit/storage errors never return mock success;
storage unavailability returns 503 and other database failures return a safe 500.

Deletion remains disabled (503 without identity; 501 even with resolved identity).
The frontend deletion function makes no HTTP request. Account lifecycle/retention,
Supabase identity deletion and session revocation require Platform coordination.

The account page and topbar use `getCustomerAccountProfile`, which never returns
mock data. Updates have no mock fallback. The older `getCustomerProfile` remains
demo-capable for teammate-owned delivery/default-address callers only; it is not
an identity source. Booking, tracking, history, receipt and cancellation code are
otherwise unchanged. Saved-address schema repair is a separate coordinated task.

Safe unit tests live in `backend/profile_tests`, not `backend/tests`. Their conftest
blanks DATABASE_URL before imports and fails on engine/session-factory access. They
use only in-memory objects, AsyncMock sessions and HTTPX ASGITransport on a small
FastAPI app without application lifespan hooks. Run only this isolated suite:

```text
python -B -m pytest -p no:cacheprovider --confcutdir=profile_tests profile_tests
```

Run from `backend`. Do not run the old backend test suite against shared credentials.
Real persistence and provider lifecycle integration remain unverified until an
explicitly isolated database and Platform identity integration are available.
