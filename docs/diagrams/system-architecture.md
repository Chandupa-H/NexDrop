# NexDrop System Architecture Diagrams

## 1. Modular Monolith Architecture

The following diagram illustrates the single-backend modular monolith architecture and its integration points.

```mermaid
graph TD
    subgraph ClientLayer["Frontend (Next.js App Router)"]
        UI["Landing & Dashboards (React 19 / Tailwind v4)"]
        APIClient["Centralized API Client (src/lib/api-client.ts)"]
        WSClient["WebSocket Client (Live Telemetry)"]
    end

    subgraph BackendLayer["Backend Modular Monolith (FastAPI)"]
        Main["FastAPI Entrypoint (app/main.py)"]
        V1Router["Versioned Router (app/api/v1/api.py)"]
        
        subgraph DomainModules["Domain Modules"]
            Auth["Auth & Security"]
            Users["Users"]
            Customers["Customers"]
            Merchants["Merchants"]
            Couriers["Couriers"]
            Parcels["Parcels"]
            Dispatch["Dispatch Engine"]
            Pricing["Pricing & Rates"]
            Notifications["Notifications"]
            Webhooks["Webhooks"]
        end

        subgraph Integrations["Integration Adapters"]
            WSMgr["WebSocket Manager (app/integrations/websockets)"]
            RabbitClient["RabbitMQ Client (app/integrations/rabbitmq)"]
        end
    end

    subgraph DataStorage["External Infrastructure"]
        NeonDB[("Neon PostgreSQL (SQLAlchemy 2.0 / Alembic)")]
        RabbitMQ["RabbitMQ Message Broker"]
    end

    UI --> APIClient
    UI --> WSClient
    APIClient -->|HTTP / JSON| Main
    WSClient -->|WebSocket| Main
    Main --> V1Router
    V1Router --> DomainModules
    Main --> Integrations

    DomainModules -->|Async Sessions| NeonDB
    Integrations -->|Events| RabbitMQ
    Integrations -->|Push Alerts| WSClient
```

---

## 2. Module Internal Layering (Clean Architecture)

Each domain module in `app/modules/<module_name>` enforces this strict separation:

```mermaid
sequenceDiagram
    autonumber
    participant Client as HTTP Client / Next.js
    participant Route as routes.py (FastAPI)
    participant Service as service.py (Business Logic)
    participant Repo as repository.py (Data Access)
    participant DB as Neon PostgreSQL (SQLAlchemy)

    Client->>Route: HTTP POST /api/v1/parcels (ParcelCreate Schema)
    Note over Route: Validates Pydantic Schema
    Route->>Service: create_parcel(payload)
    Note over Service: Applies Business Rules & Generates Tracking Code
    Service->>Repo: create(ParcelModel)
    Repo->>DB: INSERT INTO parcels
    DB-->>Repo: Saved Record
    Repo-->>Service: Parcel ORM Instance
    Service-->>Route: Parcel Domain Object
    Note over Route: Serializes to ParcelResponse Schema
    Route-->>Client: HTTP 201 Created (JSON)
```

---

## 3. Real-Time Tracking Flow

```mermaid
sequenceDiagram
    participant CourierApp as Courier Mobile / Web
    participant FastAPI as FastAPI (/ws & /couriers/location)
    participant WSMgr as ConnectionManager
    participant Customer as Customer Tracking UI

    CourierApp->>FastAPI: PATCH /api/v1/couriers/1/location (lat, lon)
    FastAPI->>WSMgr: broadcast_to_channel("tracking-ND-1002", coordinates)
    WSMgr-->>Customer: Real-time GPS Telemetry Update
```
