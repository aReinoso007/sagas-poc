# SAGA Onboarding POC

A full-stack proof of concept demonstrating the **SAGA Orchestration pattern** applied
to a financial onboarding flow — the same pattern used in production fintech systems
where a single user action spans multiple external services (QuickBooks, Plaid, banking APIs).

Built as a portfolio project to demonstrate distributed transaction handling, automatic
compensation (rollback), and idempotent step execution.

---

## The problem this solves

In a traditional database you get ACID transactions — if step 3 fails, everything
rolls back automatically. In a distributed system where each step calls a different
external service, **there is no global transaction**.

If a user connects QuickBooks (step 2) and then Plaid fails (step 3), you can't just
`ROLLBACK`. The QuickBooks token already exists in Intuit's servers. You need to
explicitly revoke it.

The SAGA pattern solves this by:
- Breaking the flow into a sequence of **local transactions**
- Persisting the state of every step in the database
- Running **compensating transactions in reverse order** if any step fails

Compensating transactions are not "undo" — they are explicit inverse actions defined
per step. You can't un-create a user, but you can mark them inactive. You can't
unsend an OAuth request, but you can revoke the token.

---

## The onboarding flow

```
Step 1 — Create user        →  saves to DB
Step 2 — Connect QuickBooks →  OAuth2 token exchange (simulated)
Step 3 — Connect Plaid      →  bank account linking (simulated)
```

**Happy path:**
```
PENDING → RUNNING → COMPLETED
```

**If Step 3 fails:**
```
Step 3 FAILED
  → Compensate Step 2: revoke QuickBooks tokens
  → Compensate Step 1: mark user as inactive
SAGA status: FAILED — all changes rolled back
```

Every step carries an **idempotency key** (`{saga_id}:{step_name}`) so retries
are always safe — the same operation will never execute twice.

---

## Stack

| Layer      | Technology                                                                   |
|------------|------------------------------------------------------------------------------|
| Frontend   | React 18 + TypeScript + Vite 5 + TanStack Query + Zustand + Tailwind CSS    |
| Backend    | FastAPI + Strawberry GraphQL + SQLAlchemy async                              |
| Database   | PostgreSQL 15                                                                |
| Infra      | Docker Compose                                                               |

---

## Architecture

```
sagas-poc/
├── docker-compose.yml
├── infra/
│   └── init.sql                   # DB schema — enums, tables, indexes
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                # FastAPI entrypoint + CORS + lifespan
│       ├── core/
│       │   ├── config.py          # Settings via pydantic-settings + .env
│       │   └── database.py        # Async engine + session factory
│       ├── db/
│       │   └── models.py          # SQLAlchemy models (SagaExecution, SagaStep)
│       ├── saga/
│       │   ├── orchestrator.py    # SAGA state machine — the core of the POC
│       │   └── steps.py           # Step handlers + compensators per step
│       ├── services/
│       │   ├── mock_quickbooks.py # Simulates QuickBooks OAuth2 with latency
│       │   └── mock_plaid.py      # Simulates Plaid Link token exchange
│       └── graphql/
│           └── schema.py          # Strawberry schema — queries + mutations
└── frontend/
    └── src/
        ├── components/
        │   ├── OnboardingStepper.tsx  # Visual step progress with status icons
        │   └── SimulatorPanel.tsx     # Execute steps + force failures per step
        ├── hooks/
        │   └── useOnboardingSaga.ts   # TanStack Query polling + mutations
        ├── store/
        │   └── sagaStore.ts           # Zustand store for local UI state
        └── lib/
            ├── graphqlClient.ts       # graphql-request client + typed operations
            └── types.ts               # Shared TypeScript types + constants
```

---

## SAGA states

A `SagaExecution` moves through these states:

```
PENDING → RUNNING → COMPLETED
                 ↘
              COMPENSATING → FAILED
```

Each `SagaStep` tracks its own state independently:

```
PENDING → RUNNING → COMPLETED
                 ↘ FAILED

COMPLETED → COMPENSATING → COMPENSATED
```

---

## Database schema

Three tables persist every state transition:

**`saga_executions`** — one row per onboarding attempt. Tracks global status and
current step.

**`saga_steps`** — one row per step per saga. Stores the step result as JSONB
(used by compensators to know what to undo) and the error message if it failed.

**`idempotency_keys`** — lookup table. Before executing a step, the orchestrator
checks here. If the key exists, it returns the cached result without re-executing.

---

## GraphQL API

The backend exposes three operations at `http://localhost:8000/graphql`:

### Start onboarding

```graphql
mutation {
  startOnboarding(userEmail: "alex@example.com") {
    id
    status
    currentStep
    steps {
      stepName
      status
    }
  }
}
```

### Execute a step (with optional forced failure)

```graphql
mutation {
  executeStep(
    sagaId: "your-saga-id"
    stepName: "connect_plaid"
    forceFail: true
  ) {
    id
    status
    currentStep
    steps {
      stepName
      status
      errorMessage
    }
  }
}
```

### Query current status

```graphql
query {
  onboardingStatus(sagaId: "your-saga-id") {
    id
    status
    currentStep
    steps {
      stepName
      status
      errorMessage
      result
    }
  }
}
```

---

## How to run

### Prerequisites
- Docker + Docker Compose v2
- Node.js 20.18+ (frontend local dev only)
- Python 3.12+ (backend local dev only)

### With Docker (recommended)

```bash
# From the repo root
docker compose up --build
```

| Service            | URL                           |
|--------------------|-------------------------------|
| Frontend           | http://localhost:5173         |
| GraphQL API        | http://localhost:8000/graphql |
| GraphQL Playground | http://localhost:8000/graphql |
| PostgreSQL         | localhost:5432                |

### Frontend only (local dev)

```bash
cd frontend
npm install
npm run dev
```

### Backend only (local dev)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## Demo walkthrough

### Happy path
1. Enter an email and click **Start onboarding**
2. Click **Run step** on each step in order
3. Watch each step transition: `Pending` → `Running` → `Completed`
4. SAGA reaches `COMPLETED` — all steps done

### Compensation flow
1. Start a new onboarding
2. Run **Create user** → Completed
3. Run **Connect QuickBooks** → Completed
4. Check **Force fail** on **Connect Plaid** → click **Run & fail**
5. Watch the orchestrator compensate in reverse:
   - Connect Plaid → `Failed`
   - Connect QuickBooks → `Rolled back`
   - Create user → `Rolled back`
6. Banner: *"Onboarding failed — all changes rolled back"*

---

## Screenshots

### Happy path — all steps completed
<!-- Add screenshot here -->
<img width="726" height="825" alt="image" src="https://github.com/user-attachments/assets/39c16b83-cb19-4917-804a-2ee57b74c9b1" />


### Compensation flow — Plaid fails, prior steps rolled back
<!-- Add screenshot here -->
<img width="726" height="825" alt="image" src="https://github.com/user-attachments/assets/c9e04431-25bb-427c-a439-73cb82ef1797" />


### GraphQL Playground — startOnboarding mutation
<!-- Add screenshot here -->
<img width="1367" height="618" alt="image" src="https://github.com/user-attachments/assets/9e2066b3-c1e8-4161-a263-b936b0e96837" />



### GraphQL Playground — executeStep with forceFail
<img width="1367" height="618" alt="image" src="https://github.com/user-attachments/assets/f7a18e61-ff40-4999-b4ee-f97c8739d500" />

<!-- Add screenshot here -->

### GraphQL Playground — onboardingStatus query showing FAILED + COMPENSATED steps
<!-- Add screenshot here -->
<img width="1367" height="798" alt="image" src="https://github.com/user-attachments/assets/0f076080-c082-4e3a-84ae-51117b63e785" />


---

## Key concepts for interviews

**Why not a database transaction?**
Each step calls an external API (QuickBooks, Plaid). You can't wrap an HTTP call
in a `BEGIN/COMMIT` block. SAGAs are the standard pattern for distributed
transactions in microservices and fintech systems.

**Why orchestration over choreography?**
Orchestration has a central coordinator (the SAGA manager) that controls the
sequence. Easier to reason about, debug, and audit — critical in fintech where
every state transition needs to be traceable.

**Why idempotency keys?**
Network failures cause retries. Without idempotency keys, a retry on step 2
could create a second QuickBooks connection. The key `{saga_id}:{step_name}`
guarantees the operation runs exactly once regardless of how many times it's called.

**Why TanStack Query for polling?**
The polling stops automatically when the SAGA reaches a terminal state
(`COMPLETED` or `FAILED`). `refetchInterval` accepts a function that reads
the current query data and returns `false` to stop — no manual cleanup needed.

**Why Zustand over Redux?**
This project owns 40% of a UI in a small team with an existing codebase. Zustand
has no providers, no boilerplate, and surgical re-renders — the right tradeoff
for fast iteration without restructuring the app.

---

## Author

Alex Reinoso — Full Stack Engineer
[LinkedIn](https://www.linkedin.com/in/alex-reinoso/) · [Portfolio](https://areinoso007.github.io/portfolio)
