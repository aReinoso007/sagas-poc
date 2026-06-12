import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class SagaStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    COMPENSATING = "COMPENSATING"
    FAILED = "FAILED"


class StepStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    COMPENSATING = "COMPENSATING"
    COMPENSATED = "COMPENSATED"
    FAILED = "FAILED"


class SagaExecution(Base):
    __tablename__ = "saga_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[SagaStatus] = mapped_column(
        Enum(SagaStatus, name="saga_status"), default=SagaStatus.PENDING
    )
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    steps: Mapped[list["SagaStep"]] = relationship(
        "SagaStep", back_populates="saga", order_by="SagaStep.step_number"
    )


class SagaStep(Base):
    __tablename__ = "saga_steps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    saga_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("saga_executions.id", ondelete="CASCADE")
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[StepStatus] = mapped_column(
        Enum(StepStatus, name="step_status"), default=StepStatus.PENDING
    )
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    saga: Mapped["SagaExecution"] = relationship(
        "SagaExecution", back_populates="steps"
    )