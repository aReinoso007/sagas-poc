from __future__ import annotations

import uuid
from typing import Optional

import strawberry
from strawberry.types import Info

from app.saga.orchestrator import SAGAOrchestrator
from app.db.models import SagaExecution


@strawberry.type
class StepType:
    id: str
    step_number: int
    step_name: str
    status: str
    error_message: Optional[str]
    result: Optional[strawberry.scalars.JSON]


@strawberry.type
class SagaType:
    id: str
    user_email: str
    status: str
    current_step: int
    steps: list[StepType]


@strawberry.type
class Query:

    @strawberry.field
    async def onboarding_status(
        self,
        saga_id: str,
        info: Info,
    ) -> Optional[SagaType]:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        db = info.context["db"]
        result = await db.execute(
            select(SagaExecution)
            .where(SagaExecution.id == uuid.UUID(saga_id))
            .options(selectinload(SagaExecution.steps))
        )
        saga = result.scalar_one_or_none()
        if not saga:
            return None
        return _serialize_saga(saga)


@strawberry.type
class Mutation:

    @strawberry.mutation
    async def start_onboarding(
        self,
        user_email: str,
        info: Info,
    ) -> SagaType:
        db = info.context["db"]
        orchestrator = SAGAOrchestrator(db)
        saga = await orchestrator.start(user_email=user_email)
        return _serialize_saga(saga)

    @strawberry.mutation
    async def execute_step(
        self,
        saga_id: str,
        step_name: str,
        force_fail: bool = False,
        info: Info = strawberry.UNSET,
    ) -> SagaType:
        db = info.context["db"]
        orchestrator = SAGAOrchestrator(db)
        saga = await orchestrator.execute_step(
            saga_id=uuid.UUID(saga_id),
            step_name=step_name,
            force_fail=force_fail,
        )
        return _serialize_saga(saga)


def _serialize_saga(saga: SagaExecution) -> SagaType:
    return SagaType(
        id=str(saga.id),
        user_email=saga.user_email,
        status=saga.status.value,
        current_step=saga.current_step,
        steps=[
            StepType(
                id=str(s.id),
                step_number=s.step_number,
                step_name=s.step_name,
                status=s.status.value,
                error_message=s.error_message,
                result=s.result,
            )
            for s in sorted(saga.steps, key=lambda x: x.step_number)
        ],
    )


schema = strawberry.Schema(query=Query, mutation=Mutation)