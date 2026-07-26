# 🚛 TransitOps — Smart Transport Operations Platform

**A role-based fleet, trip, and cost-management backend + dashboard, built end-to-end in an 8-hour hackathon.**

**Stack:** Python 3.11+ · FastAPI · PostgreSQL · React 19 · Vite · JWT Auth · License: Unspecified

> Built for the **Odoo 8-Hour Hackathon**. TransitOps models a small logistics operator's day-to-day: dispatching vehicles and drivers, tracking maintenance, logging fuel/expenses, and reporting on fleet economics — all gated behind a real role-based permission system, not a demo toggle.

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Key Features](#-key-features)
- [Innovation & Unique Selling Points](#-innovation--unique-selling-points)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Role-Based Access Control](#-role-based-access-control)
- [Core Workflow](#-core-workflow)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Usage Instructions](#-usage-instructions)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Known Limitations & Open Items](#-known-limitations--open-items)
- [Future Enhancements](#-future-enhancements)
- [Challenges Faced](#-challenges-faced)
- [Team](#-team)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 🎯 Problem Statement

Small and mid-sized transport/logistics operators typically coordinate fleet dispatch, driver assignment, maintenance, and fuel/expense tracking through **spreadsheets or fragmented tools**, split across roles (fleet managers, dispatchers, safety officers, finance) with no shared source of truth. This causes:

- No real-time visibility into which vehicles/drivers are available, on trip, or in the shop.
- Manual, error-prone capacity checks (e.g. is this cargo within the vehicle's load limit?) before dispatch.
- No unified view of operational cost, fuel efficiency, or ROI per vehicle.
- No access boundaries — anyone with the sheet can edit anything.

## 💡 Solution Overview

**TransitOps** is a role-gated operations platform with a FastAPI backend and a React dashboard covering the full lifecycle of a fleet operation:

- **Vehicle Registry** — track vehicles, capacities, status, and lifetime cost.
- **Driver & Safety Profiles** — licensing, safety scores, availability.
- **Trip Dispatcher** — a Draft → Dispatched → Completed/Cancelled workflow with live capacity and eligibility validation.
- **Maintenance Log** — service records that automatically take a vehicle out of the dispatch pool and bring it back.
- **Fuel & Expense Tracking** — manual and trip-completion-driven fuel logging, plus toll/other expenses.
- **Reports & Analytics** — fuel efficiency, fleet utilization, operational cost, ROI, monthly revenue, and top-cost vehicles, all computed server-side.
- **Real-Time Dashboard** — a separate, always-visible operational snapshot (distinct from the historical analytics module).

Every module is gated by a **4-role permission matrix** enforced at the API layer via FastAPI dependencies — not just hidden in the UI.

---

## ✨ Key Features

| Area | What it does |
|---|---|
| 🔐 **JWT Auth with Role Verification** | Login requires `email + password + role` to match a single DB row; role checks re-read from the DB on every request, so a role change takes effect immediately without re-login. |
| 🚦 **Full Trip State Machine** | `create → dispatch → complete / cancel`, with vehicle/driver availability, license expiry, and cargo-capacity checks enforced in the service layer, not the frontend. |
| 🛠️ **Maintenance-Aware Dispatch Pool** | Opening a maintenance log automatically pulls a vehicle out of `Available`; closing it restores availability (unless the vehicle is retired). |
| ⛽ **Auto Fuel Logging** | Completing a trip auto-creates a `FuelLog` entry from the driver-reported fuel consumption — no double entry. |
| 📊 **Two Distinct Utilization Metrics** | Page 2's real-time `fleet_utilization_pct` (vehicles currently on trip) is deliberately kept separate from Page 8's historical `fleet_utilization` (share of completed trips) — same name, different meaning, intentionally documented to avoid frontend conflation. |
| 🧮 **Server-Computed Financial Reports** | Fuel efficiency (km/L), operational cost, ROI, and monthly revenue are all computed from stored trip/fuel/maintenance/expense data — not client-side aggregation. |
| 🗑️ **No Hard Deletes** | Vehicles are **retired**, never deleted, preserving trip/maintenance/fuel history permanently for audit and reporting. |
| 🧩 **Module-Level RBAC, Not Field-Stripping** | Each of the 4 roles gets `CRUD`, `Read-only`, or `403` per module — enforced with a single `require_role(*roles)` FastAPI dependency factory reused across every router. |

## 🚀 Innovation & Unique Selling Points

- **Business rules live in the service layer, not the routes or the frontend.** Capacity checks, license-expiry checks, and status transitions are enforced in `services/`, so the same rules apply no matter which client calls the API.
- **Atomic, single-commit transactions** for every state-changing operation (dispatch, complete, cancel, maintenance open/close) — no partially-applied state on failure.
- **Deliberately asymmetric error specificity**: `get_current_user` returns a generic 401 for any auth failure (standard security practice), while `login` returns granular, per-failure-point messages — a conscious hackathon-scoped trade-off between UX and information leakage, explicitly documented rather than accidental.
- **Dashboard vs. Reports separation is a real architectural decision**, not a naming accident — real-time operational snapshot (`dashboard.py`) is kept in a different router and different formulas from historical analytics (`reports.py`), even though the wireframe used "Dashboard" loosely for both.

---

## 🧱 Tech Stack

**Backend**

| Layer | Technology |
|---|---|
| Framework | [FastAPI](https://fastapi.tiangolo.com/) |
| ORM | SQLAlchemy |
| Database | PostgreSQL |
| Validation | Pydantic v2 |
| Auth | JWT (`python-jose`), `OAuth2PasswordBearer` |
| Password Hashing | `passlib` (bcrypt) |
| Server | Uvicorn |

**Frontend**

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite |
| Routing | React Router v7 |
| Charts | Chart.js |
| Styling | Plain CSS (component + page-level stylesheets) |
| Linting | Oxlint |

---

## 🏗️ System Architecture

```
┌─────────────────────┐       HTTPS / JSON        ┌──────────────────────────┐
│   React + Vite SPA   │ ─────────────────────────▶ │      FastAPI Backend     │
│  (role-aware routes, │ ◀───────────────────────── │   (routers → services)   │
│   Vite dev proxy)     │        JWT Bearer          │                          │
└─────────────────────┘                             │  ┌────────────────────┐  │
                                                      │  │  core/security.py  │  │
                                                      │  │  core/dependencies │  │
                                                      │  └────────────────────┘  │
                                                      │             │            │
                                                      │  ┌────────────────────┐  │
                                                      │  │  services/*.py      │  │
                                                      │  │ (business rules,    │  │
                                                      │  │  atomic commits)    │  │
                                                      │  └────────────────────┘  │
                                                      │             │            │
                                                      │  ┌────────────────────┐  │
                                                      │  │ SQLAlchemy models   │  │
                                                      │  └────────────────────┘  │
                                                      └──────────────┬───────────┘
                                                                     │
                                                             ┌───────▼────────┐
                                                             │  PostgreSQL    │
                                                             └────────────────┘
```

**Request flow:** every protected route depends on `get_current_user` (JWT decode + active-user check) and, where relevant, `require_role(*allowed_roles)` — both defined once in `app/core/dependencies.py` and reused across all 8 routers.

---

## 🔐 Role-Based Access Control

Four roles, enforced module-by-module via `require_role()`:

| Role | Fleet (Vehicles + Maintenance) | Drivers | Trips | Fuel / Expenses | Reports |
|---|:---:|:---:|:---:|:---:|:---:|
| **Fleet Manager** | CRUD | CRUD | 🚫 | 🚫 | Read-only |
| **Dispatcher** | Read | 🚫 | CRUD | 🚫 | 🚫 |
| **Safety Officer** | 🚫 | CRUD | Read | 🚫 | 🚫 |
| **Financial Analyst** | Read | 🚫 | 🚫 | CRUD | Read-only |

- `CRUD` = full mutate access. `Read-only` = GET routes only. `🚫` = module excluded entirely.
- **Drivers** module is CRUD for **both** Fleet Manager and Safety Officer.
- The **Dashboard** (`GET /dashboard/summary`) sits outside this table — it's visible to *any* authenticated user regardless of role, since it's the shared landing page.
- No role can hard-delete any entity — vehicle removal is only possible via **retire**.

---

## 🔄 Core Workflow

**Trip lifecycle** (enforced in `services/trip_service.py`):

```
  Dispatcher creates Trip
          │  (cargo_weight ≤ vehicle.max_load_capacity checked here)
          ▼
      ┌────────┐   dispatch    ┌────────────┐   complete   ┌───────────┐
      │ Draft  │ ────────────▶ │ Dispatched │ ───────────▶ │ Completed │
      └────────┘               └────────────┘              └───────────┘
          │  cancel                   │  cancel
          ▼                           ▼
      ┌───────────┐             ┌───────────┐
      │ Cancelled │             │ Cancelled │
      └───────────┘             └───────────┘
```

- **Dispatch** requires: vehicle status `Available`, driver status `Available`, driver license not expired. On success → vehicle & driver flip to `On Trip`.
- **Complete** requires status `Dispatched`. Stores final odometer + fuel consumed, auto-creates a `FuelLog`, and returns vehicle → `Available` (odometer updated) and driver → `Available`.
- **Cancel** is allowed from `Draft` or `Dispatched` (not from `Completed`). From `Dispatched`, vehicle & driver are restored to `Available`.

**Maintenance lifecycle** (`services/maintenance_service.py`): opening a log moves the vehicle to `In Shop` (blocked if already `In Shop`/`Retired`); closing it restores `Available` unless the vehicle is `Retired`.

---

## 📁 Project Structure

```
transitops-backend/
├── app/
│   ├── main.py                # FastAPI app, CORS, router registration
│   ├── config.py               # Pydantic Settings (.env-driven)
│   ├── database.py             # SQLAlchemy engine/session
│   ├── models.py               # User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog, Expense
│   ├── schemas.py               # Pydantic v2 request/response models
│   ├── enums.py                 # RoleEnum, VehicleStatus, DriverStatus, TripStatus, ...
│   ├── core/
│   │   ├── security.py         # JWT create/decode, password hashing
│   │   └── dependencies.py     # get_current_user, require_role
│   ├── routers/
│   │   ├── auth.py
│   │   ├── vehicles.py
│   │   ├── drivers.py
│   │   ├── trips.py
│   │   ├── maintenance.py
│   │   ├── expenses.py
│   │   ├── reports.py
│   │   └── dashboard.py
│   └── services/
│       ├── auth_service.py
│       ├── trip_service.py
│       ├── maintenance_service.py
│       └── report_service.py
└── requirements.txt

frontend/
├── src/
│   ├── pages/                  # Dashboard, Fleet, Drivers, Trips, Maintenance, Fuel, Reports, Settings, Login
│   ├── components/             # Sidebar, Topbar, KpiCard, Modal, StatusPill, VehicleStatusChart, ...
│   ├── context/                # AuthContext, ToastContext
│   ├── services/                # api.js + one thin client per resource (auth, trips, vehicles, ...)
│   ├── permissions/permissions.js  # frontend mirror of the backend RBAC matrix
│   ├── hooks/useApi.js
│   └── styles/
├── vite.config.js              # dev-server proxy: /api → http://localhost:8000
└── package.json
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.11+
- PostgreSQL (running instance + a database created for the app)
- Node.js 18+ and npm

### Backend

```bash
cd transitops-backend

# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables (see Configuration section below)
cp .env.example .env            # then edit .env with your values

# 4. Run the API — tables are created automatically on startup
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`, with interactive Swagger docs at `http://localhost:8000/docs`.

> ⚠️ **No registration endpoint exists.** Users are meant to be pre-seeded directly into the `users` table (a seed script is referenced in project notes but is not part of this code snapshot). To create a login-ready user manually, insert a row into `users` with a bcrypt hash generated via `passlib.context.CryptContext(schemes=["bcrypt"])`, and a `role` matching one of the four `RoleEnum` values.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies any request to `/api/*` through to `http://localhost:8000` (configured in `vite.config.js`), so the backend must be running first.

---

## 🖥️ Usage Instructions

1. Start the backend (`uvicorn app.main:app --reload`) and confirm `/docs` loads.
2. Seed at least one `User` row per role you want to test (see note above).
3. Start the frontend (`npm run dev`) and log in with `email + password + role` matching a seeded user.
4. Navigate the sidebar — visible modules and available actions adapt to the logged-in role, mirroring the backend's RBAC matrix.
5. Typical demo path: **Vehicle Registry** (add a vehicle) → **Drivers** (add a driver) → **Trip Dispatcher** (create → dispatch → complete a trip) → **Fuel & Expenses** (see the auto-created fuel log) → **Reports** (see the updated KPIs).

---

## 🔧 Configuration

Backend configuration is read from a `.env` file via `app/config.py`:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/transitops`) | — (required) |
| `SECRET_KEY` | Secret used to sign JWTs | — (required) |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `240` |

```env
# .env.example
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transitops
SECRET_KEY=replace-with-a-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=240
```

There is no separate frontend `.env` — the API base path is handled through the Vite dev proxy (`/api` → `http://localhost:8000`).

---

## 📡 API Reference

<details>
<summary><strong>Click to expand full endpoint list</strong></summary>

| Method | Endpoint | Allowed Roles |
|---|---|---|
| POST | `/auth/login` | Public |
| GET | `/vehicles` | Fleet Manager, Dispatcher, Financial Analyst |
| GET | `/vehicles/{id}` | Fleet Manager, Dispatcher, Financial Analyst |
| POST | `/vehicles` | Fleet Manager |
| PATCH | `/vehicles/{id}` | Fleet Manager |
| POST | `/vehicles/{id}/retire` | Fleet Manager |
| GET | `/drivers` | Fleet Manager, Safety Officer |
| GET | `/drivers/{id}` | Fleet Manager, Safety Officer |
| POST | `/drivers` | Fleet Manager, Safety Officer |
| PATCH | `/drivers/{id}` | Fleet Manager, Safety Officer |
| PATCH | `/drivers/{id}/safety-score` | Fleet Manager, Safety Officer |
| PATCH | `/drivers/{id}/status` | Fleet Manager, Safety Officer |
| GET | `/trips` | Dispatcher, Safety Officer |
| GET | `/trips/{id}` | Dispatcher, Safety Officer |
| POST | `/trips` | Dispatcher |
| POST | `/trips/{id}/dispatch` | Dispatcher |
| POST | `/trips/{id}/complete` | Dispatcher |
| POST | `/trips/{id}/cancel` | Dispatcher |
| GET | `/maintenance` | Fleet Manager, Dispatcher, Financial Analyst |
| GET | `/maintenance/{id}` | Fleet Manager, Dispatcher, Financial Analyst |
| POST | `/maintenance` | Fleet Manager |
| POST | `/maintenance/{id}/close` | Fleet Manager |
| GET | `/fuel-logs` | Financial Analyst |
| POST | `/fuel-logs` | Financial Analyst |
| GET | `/expenses` | Financial Analyst |
| POST | `/expenses` | Financial Analyst |
| GET | `/reports/fuel-efficiency` | Fleet Manager, Financial Analyst |
| GET | `/reports/fleet-utilization` | Fleet Manager, Financial Analyst |
| GET | `/reports/operational-cost` | Fleet Manager, Financial Analyst |
| GET | `/reports/roi` | Fleet Manager, Financial Analyst |
| GET | `/reports/monthly-revenue` | Fleet Manager, Financial Analyst |
| GET | `/reports/top-costliest-vehicles?limit=5` | Fleet Manager, Financial Analyst |
| GET | `/dashboard/summary?vehicle_type=&status=&region=` | Any authenticated user |

</details>

Full interactive documentation (request/response schemas, try-it-out) is auto-generated by FastAPI at `/docs` once the server is running.

---

## ⚠️ Known Limitations & Open Items

These are explicitly deferred, not oversights:

- **Account lockout after 5 failed login attempts** — noted on the login wireframe but not implemented; would require a `failed_attempts` / `locked_until` field or table.
- **No user registration or seed script included** — users must be inserted directly into the database.
- **Settings & RBAC page** is UI-only; the permission matrix is not persisted or editable through the API — it's documentation, not configuration.
- **No token refresh or revocation** — a single access token is issued per login with a fixed expiry (default 4 hours); there is no blacklist/logout-invalidation mechanism.
- **No "unassigned draft trip" state** — every trip requires a vehicle and driver at creation time, by design.

## 🔮 Future Enhancements

- Implement login lockout / rate limiting.
- Add a seed/admin script (or a protected admin-only user-creation endpoint) for onboarding staff without direct DB access.
- Persist Settings & RBAC configuration so permissions become editable at runtime rather than hardcoded.
- Add refresh tokens and server-side session/token revocation.
- Add automated tests (unit tests for service-layer business rules, integration tests for RBAC boundaries).
- Add pagination/filtering to list endpoints for larger fleets.

## 🧗 Challenges Faced

- **Reconciling two "fleet utilization" metrics with the same name** — the wireframe used identical labeling for a real-time dashboard number and a historical analytics number; the fix was making them structurally distinct in code (`dashboard.py` vs `reports.py`) and documenting the difference explicitly to prevent frontend mix-ups.
- **Keeping capacity/eligibility checks out of the frontend** — the wireframe implied live UI validation (disabling the Dispatch button), but the actual guarantee had to live in the service layer so the rule holds regardless of client.
- **Deciding what *not* to build** in an 8-hour window — e.g. skipping registration, refresh tokens, and settings persistence deliberately, and documenting each as an open item rather than silently omitting it.

## 👥 Team

> _Add team member names, roles, and contributions here (e.g. Backend, Frontend, Design, Presentation)._

| Name | Role |
|---|---|
|DARSHAN S| Backend (FastAPI, DB design, business logic) |
|ARJUN K| Frontend (React, UI/UX) |
|PUJITA K| RESEARCH ANALYST |

