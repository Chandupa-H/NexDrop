# NexDrop — Architecture Overview

NexDrop is an enterprise-scale Parcel Delivery and Courier Management System designed for a 10-member university engineering team.

## Architectural Style: Modular Monolith

NexDrop adopts a **Modular Monolith** architecture. Rather than introducing distributed network overhead, complex service meshes, and eventual consistency premature complexity (microservices / Kubernetes), all domain modules reside in a single cohesive backend with strict internal isolation boundaries.

### Core Principles

1. **Clear Domain Boundaries:** Each business module (`customers`, `merchants`, `couriers`, `parcels`, `dispatch`, `pricing`, `notifications`, `webhooks`) owns its domain logic and database entities.
2. **Layered Separation of Concerns:**
   - **Routes Layer (`routes.py`):** Handles HTTP serialization, route definition, dependency injection, and status codes. Contains zero business logic.
   - **Service Layer (`service.py`):** Encapsulates core business rules, validation, and domain orchestration.
   - **Repository Layer (`repository.py`):** Isolates database queries and ORM operations from business logic.
   - **Data Layer (`models.py`):** Declarative SQLAlchemy 2.0 ORM schemas.
   - **Contract Layer (`schemas.py`):** Pydantic v2 schemas for request validation and response serialization.
3. **Graceful Degradation:** The backend application can boot up and serve health checks and utility endpoints without live database or message broker credentials.
4. **Reproducible Schema Evolution:** Database tables are exclusively migrated via Alembic, preventing runtime schema divergence.

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), Alembic |
| **Database** | PostgreSQL hosted on Neon (Serverless Postgres) with asyncpg driver |
| **Messaging** | RabbitMQ (AMQP Event Exchange) |
| **Real-time** | WebSockets for live driver location telemetry & notifications |
| **Testing** | Pytest, HTTPX, Vitest, React Testing Library |
| **DevOps** | Multi-stage Docker, Docker Compose orchestration |
