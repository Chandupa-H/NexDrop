# NexDrop — Parcel Delivery & Courier Management System

NexDrop is a modern, modular monolith web platform for end-to-end parcel shipping, courier fleet dispatching, and real-time package tracking. Built for a 10-member university engineering team, the architecture prioritizes strict domain separation, type safety, and clean boundaries.

---

## Architecture & Technology Stack

- **Architecture:** Modular Monolith (1 Frontend, 1 Backend)
- **Frontend:** [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Lucide Icons)
- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+, Pydantic v2, SQLAlchemy 2.0 Async, Alembic)
- **Database:** PostgreSQL (Designed for [Neon Serverless Postgres](https://neon.tech/) with `asyncpg` / `psycopg`)
- **Messaging & Real-time:** RabbitMQ integration stubs & FastAPI WebSockets
- **Testing:** Pytest, HTTPX (Backend) & Vitest, React Testing Library (Frontend)
- **Containerization:** Docker & Docker Compose

> [!NOTE]
> **Graceful Unconfigured Mode:** The frontend and backend run and pass all health checks immediately without requiring live database credentials or active message brokers.

---

## Project Structure

```text
nexdrop/
├── frontend/                     # Next.js 16 App Router application
│   ├── src/
│   │   ├── app/                  # Next.js pages and layouts
│   │   ├── components/
│   │   │   ├── ui/               # Reusable UI primitives (Button, Card, Badge)
│   │   │   └── shared/           # Common components (Navbar, Footer)
│   │   ├── features/             # Team feature modules
│   │   │   ├── auth/             # Authentication & user profile types
│   │   │   ├── customers/        # Customer address & account types
│   │   │   ├── merchants/        # Merchant profile & API key types
│   │   │   ├── couriers/         # Courier fleet & vehicle types
│   │   │   ├── parcels/          # Parcel lifecycle & tracking types
│   │   │   └── dispatch/         # Dispatch assignment types
│   │   ├── hooks/                # Custom React hooks (e.g., useBackendHealth)
│   │   ├── lib/                  # Utilities & centralized API client (api-client.ts)
│   │   ├── test/                 # Vitest test suite and test setup
│   │   └── types/                # Central TypeScript types export
│   ├── package.json
│   ├── tsconfig.json             # TypeScript strict mode enabled
│   └── Dockerfile
├── backend/                      # FastAPI Modular Monolith application
│   ├── app/
│   │   ├── main.py               # FastAPI application entrypoint & lifespan
│   │   ├── core/                 # App configuration (config.py)
│   │   ├── db/                   # SQLAlchemy async engine, session & base
│   │   ├── api/v1/               # Versioned API router (/api/v1/)
│   │   │   ├── api.py            # Aggregated router mounting all modules
│   │   │   └── endpoints/        # Root endpoints (health.py)
│   │   ├── modules/              # 10 Domain Business Modules
│   │   │   ├── auth/             # Authentication stubs (JWT, Argon2)
│   │   │   ├── users/            # User identity & roles
│   │   │   ├── customers/        # Customer profiles & default addresses
│   │   │   ├── merchants/        # Merchant registrations & API keys
│   │   │   ├── couriers/         # Courier fleet & live GPS telemetry
│   │   │   ├── parcels/          # Parcel creation, barcodes & status
│   │   │   ├── dispatch/         # Courier-to-parcel dispatch engine
│   │   │   ├── pricing/          # Tiered fare calculation engine
│   │   │   ├── notifications/    # Alert routing (SMS, Email, In-App, Push)
│   │   │   └── webhooks/         # Merchant webhook callbacks
│   │   └── integrations/
│   │       ├── rabbitmq/         # RabbitMQ client connection stub
│   │       └── websockets/       # WebSocket real-time connection manager
│   ├── migrations/               # Alembic database migrations environment
│   ├── tests/                    # Pytest test suite (health & pricing)
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
├── docs/                         # Architecture, Diagrams & API Documentation
│   ├── architecture/             # Architectural decisions & module breakdown
│   ├── diagrams/                 # Mermaid system diagrams
│   └── api/                      # API endpoint specifications
├── docker-compose.yml            # Multi-container orchestration (app, db, rabbitmq)
├── .env.example                  # Environment variable template
├── .gitignore                    # Comprehensive repository gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js:** v20.x or v22.x
- **Python:** 3.12+ or 3.13+
- **Docker & Docker Compose:** (Optional for containerized run)

---

### 1. Environment Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Default settings are pre-configured to allow the application to start in offline mode without requiring live database credentials.

#### Maps

The courier delivery details map uses Leaflet with OpenStreetMap tiles and OSRM routing. No API key or billing setup is required. Set the optional `NEXT_PUBLIC_ROUTING_BASE_URL` in `frontend/.env.local` and restart the dev server to use another OSRM-compatible routing service; otherwise the app uses `https://router.project-osrm.org`.

OpenStreetMap's public tile servers and the public OSRM demo server are intended for light development/demo use and are subject to their usage policies. Production deployments should use a self-hosted or commercial tile and routing provider.

Courier delivery mock data and simulated GPS are development-only. `NEXT_PUBLIC_USE_MOCK_COURIER_DELIVERIES=true` enables the mock fallback during local development; set it to `false` to disable the mock fallback and use authenticated API requests. The production frontend never switches to mock data.

Courier delivery mock data and simulated GPS are development-only. `NEXT_PUBLIC_USE_MOCK_COURIER_DELIVERIES=true` enables the mock fallback during local development; set it to `false` to disable the mock fallback and use authenticated API requests. The production frontend never switches to mock data.

---

### 2. Backend Setup (FastAPI)

1. Navigate to the backend directory and activate a Python virtual environment:

```bash
# Windows (PowerShell)
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS
cd backend
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the FastAPI development server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. Verify backend health:
- Health check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) (Returns `{"status": "healthy"}`)
- Interactive Swagger UI: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- Interactive ReDoc: [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)

---

### 3. Frontend Setup (Next.js)

1. Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install --legacy-peer-deps
```

2. Start the Next.js development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser. The landing page will automatically connect to your running backend and display live health telemetry.

---

### 4. Running with Docker Compose

To start the full stack including backend, frontend, local PostgreSQL, and RabbitMQ:

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- RabbitMQ Management UI: `http://localhost:15672` (guest / guest)

---

## Running Tests

### Backend Tests (Pytest + HTTPX)

From the project root:

```bash
# Run all backend unit and integration tests
backend/venv/Scripts/pytest backend/tests -v
```

### Frontend Tests (Vitest + React Testing Library)

From the `frontend/` directory:

```bash
cd frontend
npm test
```

---

## Database Migrations (Neon PostgreSQL & Alembic)

NexDrop uses Alembic for declarative schema migrations. Database tables are **never** created automatically on startup.

When you are ready to connect to your live Neon database:
1. Obtain your Neon connection string from the [Neon Console](https://console.neon.tech).
2. Set `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://<user>:<password>@<ep-id>.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Run Alembic commands from the `backend/` directory:

```bash
cd backend

# Generate a new migration revision after adding/modifying models
alembic revision --autogenerate -m "create_initial_schema"

# Apply pending migrations to database
alembic upgrade head

# Roll back the most recent migration
alembic downgrade -1
```

---

## 10-Member Team Development Conventions

Each team member is assigned specific modules under `backend/app/modules/` and `frontend/src/features/`.

### Consistent Module Conventions

Each backend module follows a 5-file architecture:

| File | Purpose | Rule |
|---|---|---|
| `models.py` | SQLAlchemy 2.0 ORM models | Inherit from `Base` and `TimestampMixin`. Define foreign keys clearly. |
| `schemas.py` | Pydantic v2 schemas | Provide `*Base`, `*Create`, and `*Response` models with `from_attributes = True`. |
| `repository.py` | Data Access Layer | Encapsulate all database queries (`select`, `insert`, `update`). Never write raw queries in routes. |
| `service.py` | Business Logic Layer | Validate business invariants, orchestrate repositories, and format domain data. |
| `routes.py` | FastAPI APIRouter | Keep route handlers thin. Delegate business decisions to the service layer. |

### Security & Secret Rules

- **Never commit `.env` files** or live credentials.
- **Never expose database credentials** to the frontend client.
- Always use `process.env.NEXT_PUBLIC_API_URL` through `src/lib/api-client.ts`.
- All new API endpoints must be prefixed under `/api/v1/`.

---

## License

Developed for University Enterprise Application Development (EAD) Coursework.
