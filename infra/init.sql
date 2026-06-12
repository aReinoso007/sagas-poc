CREATE TYPE saga_status AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'COMPENSATING',
  'FAILED'
);

CREATE TYPE step_status AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'COMPENSATING',
  'COMPENSATED',
  'FAILED'
);

CREATE TABLE IF NOT EXISTS saga_executions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email  VARCHAR(255) NOT NULL,
    status      saga_status NOT NULL DEFAULT 'PENDING',
    current_step INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saga_steps (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id          UUID NOT NULL REFERENCES saga_executions(id) ON DELETE CASCADE,
    step_number      INTEGER NOT NULL,
    step_name        VARCHAR(100) NOT NULL,
    status           step_status NOT NULL DEFAULT 'PENDING',
    idempotency_key  VARCHAR(255) UNIQUE NOT NULL,
    result           JSONB,
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key        VARCHAR(255) PRIMARY KEY,
    saga_id    UUID NOT NULL,
    step_name  VARCHAR(100) NOT NULL,
    response   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saga_steps_saga_id    ON saga_steps(saga_id);
CREATE INDEX idx_saga_steps_idempotency ON saga_steps(idempotency_key);
CREATE INDEX idx_saga_executions_status ON saga_executions(status);