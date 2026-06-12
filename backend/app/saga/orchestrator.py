import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import SagaExecution, SagaStatus, SagaStep, StepStatus
from app.saga.steps import STEP_REGISTRY


class SAGAOrchestrator:

    STEPS = [
        "create_user",
        "connect_quickbooks",
        "connect_plaid",
    ]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def start(self, user_email: str) -> SagaExecution:
        saga = SagaExecution(
            user_email=user_email,
            status = SagaStatus.RUNNING,
            current_step = 0
        )
        self.db.add(saga)
        await self.db.flush()
        
        for i, step_name in enumerate(self.STEPS):
            step = SagaStep(
                saga_id=saga.id,
                step_number=i,
                step_name=step_name,
                status=StepStatus.PENDING,
                idempotency_key=f"{saga.id}:{step_name}",
            )
        
        await self.db.commit()
        
        # use _get_saga_with_steps instead of refresh
        # to guarantee that steps are loaded with selectinload
        return await self._get_saga_with_steps(saga.id)
    
    async def execute_step(
        self,
        saga_id: uuid.UUID,
        step_name: str,
        force_fail: bool = False,
    ) -> SagaExecution:
        saga = await self._get_saga_with_steps(saga_id)

        if saga.status not in (SagaStatus.RUNNING, SagaStatus.PENDING):
            raise ValueError(f"SAGA {saga_id} no está en estado ejecutable: {saga.status}")

        step = next((s for s in saga.steps if s.step_name == step_name), None)
        if not step:
            raise ValueError(f"Paso '{step_name}' no encontrado")

        if step.status == StepStatus.COMPLETED:
            return saga

        await self._update_step(step.id, StepStatus.RUNNING)
        await self._update_saga(saga.id, SagaStatus.RUNNING, step.step_number)

        handler = STEP_REGISTRY.get(step_name)
        if not handler:
            raise ValueError(f"No existe handler para: {step_name}")

        try:
            result = await handler.execute(
                saga_id=saga_id,
                user_email=saga.user_email,
                idempotency_key=step.idempotency_key,
                force_fail=force_fail,
            )
            await self._update_step(step.id, StepStatus.COMPLETED, result=result)

            is_last_step = step.step_number == len(self.STEPS) - 1
            if is_last_step:
                await self._update_saga(saga.id, SagaStatus.COMPLETED, step.step_number)
            else:
                await self._update_saga(saga.id, SagaStatus.RUNNING, step.step_number + 1)

        except Exception as e:
            await self._update_step(step.id, StepStatus.FAILED, error_message=str(e))
            await self._compensate(saga, step.step_number)

        await self.db.commit()
        return await self._get_saga_with_steps(saga_id)

    async def _compensate(self, saga: SagaExecution, failed_step_number: int) -> None:
        await self._update_saga(saga.id, SagaStatus.COMPENSATING, failed_step_number)

        completed_steps = [
            s for s in saga.steps
            if s.status == StepStatus.COMPLETED
        ]

        for step in reversed(completed_steps):
            compensator = STEP_REGISTRY.get(step.step_name)
            if not compensator:
                continue
            try:
                await self._update_step(step.id, StepStatus.COMPENSATING)
                await compensator.compensate(
                    saga_id=saga.id,
                    step_result=step.result or {},
                )
                await self._update_step(step.id, StepStatus.COMPENSATED)
            except Exception as e:
                await self._update_step(
                    step.id,
                    StepStatus.FAILED,
                    error_message=f"Compensation failed: {e}",
                )

        await self._update_saga(saga.id, SagaStatus.FAILED, failed_step_number)

    async def _get_saga_with_steps(self, saga_id: uuid.UUID) -> SagaExecution:
        result = await self.db.execute(
            select(SagaExecution)
            .where(SagaExecution.id == saga_id)
            .options(selectinload(SagaExecution.steps))
        )
        saga = result.scalar_one_or_none()
        if not saga:
            raise ValueError(f"SAGA {saga_id} no encontrada")
        return saga

    async def _update_step(
        self,
        step_id: uuid.UUID,
        status: StepStatus,
        result: dict | None = None,
        error_message: str | None = None,
    ) -> None:
        values: dict = {
            "status": status,
            "updated_at": datetime.now(timezone.utc),
        }
        if result is not None:
            values["result"] = result
        if error_message is not None:
            values["error_message"] = error_message

        await self.db.execute(
            update(SagaStep).where(SagaStep.id == step_id).values(**values)
        )

    async def _update_saga(
        self,
        saga_id: uuid.UUID,
        status: SagaStatus,
        current_step: int,
    ) -> None:
        await self.db.execute(
            update(SagaExecution)
            .where(SagaExecution.id == saga_id)
            .values(
                status=status,
                current_step=current_step,
                updated_at=datetime.now(timezone.utc),
            )
        )