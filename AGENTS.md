# NexDrop — Global Agent & Developer Instructions

**Project:** NexDrop Parcel Delivery and Courier Management Platform  
**Architecture:** Modular Monolith (FastAPI Backend + Next.js App Router Frontend)  
**Team Structure:** 4 Specialized Squads (Customer, Merchant, Courier, Dispatcher/Platform)

---

## 1. Quick Navigation & Source of Truth

- **Frontend & UI Guidelines:** [frontend/AGENTS.md](file:///d:/UOM/Level%2003/01%20sem/EAD/Project/Project/frontend/AGENTS.md)
- **Team Work Breakdown & Squad Ownership:** [docs/architecture/team_breakdown.md](file:///d:/UOM/Level%2003/01%20sem/EAD/Project/Project/docs/architecture/team_breakdown.md)
- **Architecture Overview:** [docs/architecture/overview.md](file:///d:/UOM/Level%2003/01%20sem/EAD/Project/Project/docs/architecture/overview.md)
- **API Specifications:** [docs/api/endpoints.md](file:///d:/UOM/Level%2003/01%20sem/EAD/Project/Project/docs/api/endpoints.md)

---

## 2. Core Repository Rules for Coding Agents

1. **Modular Isolation:**
   - Always work inside the target feature module:
     - Frontend: `frontend/src/features/<squad>/`
     - Backend: `backend/app/modules/<squad>/`
   - Do not modify another squad's code or shared infrastructure without alignment.

2. **Clean Backend Architecture (5-File Convention):**
   Every backend domain module strictly follows:
   - `models.py` (SQLAlchemy 2.0 ORM)
   - `schemas.py` (Pydantic v2 validation contracts)
   - `repository.py` (Isolated database queries)
   - `service.py` (Business logic layer)
   - `routes.py` (FastAPI APIRouter)

3. **Status Enums:**
   The single source of truth for parcel statuses is:
   `pending`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `cancelled`.

4. **Zero-Credential Startup:**
   The backend must always boot up and serve health checks (`GET /api/v1/health`) without crashing, even if `DATABASE_URL` or `RABBITMQ_URL` are not set in `.env`.

5. **Verification Before Concluding:**
   - Backend tests: `backend/venv/Scripts/pytest backend/tests -v`
   - Frontend tests: `npm test` (inside `frontend/`)
   - Frontend build: `npm run build` (inside `frontend/`)
