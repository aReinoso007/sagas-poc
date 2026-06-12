# SAGA Onboarding POC

A proof of concept demonstrating the **SAGA Orchestration pattern** applied to a
financial onboarding flow. Built to show how distributed transactions work in
practice — including automatic compensation (rollback) when a step fails midway.

---

## What this demonstrates

In a traditional database you get ACID transactions — if step 3 fails, everything
rolls back automatically. In a distributed system where each step calls a different
external service (your DB, QuickBooks, Plaid), there is no global transaction.

The SAGA pattern solves this by:
1. Breaking the flow into a sequence of local transactions
2. Persisting the state of each step in the database
3. If a step fails, running **compensating transactions** in reverse order

Compensating transactions are not "undo" — they are explicit inverse actions.
You can't unsend an email, but you can revoke a token. You can't un-create a user,
but you can mark them inactive.

---

## The onboarding flow
Step 1 — Create user        → saves to DB
Step 2 — Connect QuickBooks → OAuth2 token exchange (simulated)
Step 3 — Connect Plaid      → bank account linking (simulated)

### If Step 3 fails:

Compensate Step 2 → revoke QuickBooks tokens
Compensate Step 1 → mark user as inactive


Every step carries an **idempotency key** so retries are safe — the same
operation won't execute twice even if the request is repeated.

---

## Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Frontend   | React 18 + TypeScript + Vite + TanStack Query + Zustand + Tailwind |
| Backend    | FastAPI + Strawberry GraphQL + SQLAlchemy (async)   |
| Database   | PostgreSQL 15                                       |
| Infra      | Docker Compose                                      |

---

## Project structure
sagas-poc/
├── docker-compose.yml
├── infra/
│   └── init.sql              # DB schema (enums, tables, indexes)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py           # FastAPI entrypoint + CORS
│       ├── core/
│       │   ├── config.py     # Settings via pydantic-settings
│       │   └── database.py   # Async engine + session factory
│       ├── db/
│       │   └── models.py     # SQLAlchemy models (SagaExecution, SagaStep)
│       ├── saga/
│       │   ├── orchestrator.py  # The SAGA state machine
│       │   └── steps.py         # Step handlers + compensators
│       ├── services/
│       │   ├── mock_quickbooks.py  # Simulates QuickBooks OAuth2
│       │   └── mock_plaid.py       # Simulates Plaid Link token exchange
│       └── graphql/
│           └── schema.py     # Strawberry schema (queries + mutations)
└── frontend/
└── src/
├── components/
│   ├── OnboardingStepper.tsx  # Visual step progress
│   └── SimulatorPanel.tsx     # Force success / failure per step
├── hooks/
│   └── useOnboardingSaga.ts   # Polling + mutations via TanStack Query
├── store/
│   └── sagaStore.ts           # Zustand store for local UI state
└── lib/
└── graphqlClient.ts       # Fetch-based GraphQL client


---

## How to run

### Prerequisites
- Docker + Docker Compose
- Node.js 20+ (only needed if running frontend outside Docker)
- Python 3.12+ (only needed if running backend outside Docker)

### With Docker (recommended)

```bash
# From the repo root
docker compose up --build
```

| Service         | URL                            |
|-----------------|--------------------------------|
| Frontend        | http://localhost:5173          |
| GraphQL API     | http://localhost:8000/graphql  |
| GraphQL Playground | http://localhost:8000/graphql (browser) |
| PostgreSQL      | localhost:5432                 |

### Without Docker (backend only)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Without Docker (frontend only)

```bash
cd frontend
npm install
npm run dev
```

---

## Key concepts to understand

### SAGA states

A `SagaExecution` moves through these states:

PENDING → RUNNING → COMPLETED
↘ COMPENSATING → FAILED

### Idempotency keys

Every step is identified by a unique key: `{saga_id}:{step_name}`.
If the same step is executed twice (e.g. due to a network retry), the second
call detects the existing key and returns the cached result without re-executing.
This prevents creating duplicate QuickBooks connections or Plaid items.

### Why GraphQL + Strawberry?

The frontend polls `onboardingStatus` every second to show live progress.
GraphQL lets the frontend request exactly the fields it needs — status, current
step, and per-step details — in a single round trip. Strawberry generates the
schema directly from Python type annotations, keeping backend types as the
source of truth.

---

## What you can demo in an interview

1. Start an onboarding flow via the UI
2. Watch each step execute with real latency (simulated API calls)
3. Use the **Simulator Panel** to force a failure on any step
4. Watch the orchestrator execute compensating transactions in reverse
5. Open the GraphQL Playground and query the saga state directly
6. Check the PostgreSQL `saga_steps` table to see every state transition logged