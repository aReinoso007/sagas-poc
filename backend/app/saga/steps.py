import asyncio
import uuid
from abc import ABC, abstractmethod

from app.services.mock_quickbooks import MockQuickBooksService
from app.services.mock_plaid import MockPlaidService


class StepHandler(ABC):

    @abstractmethod
    async def execute(
        self,
        saga_id: uuid.UUID,
        user_email: str,
        idempotency_key: str,
        force_fail: bool = False,
    ) -> dict:
        """Ejecuta el paso. Lanza excepción si falla."""

    @abstractmethod
    async def compensate(
        self,
        saga_id: uuid.UUID,
        step_result: dict,
    ) -> None:
        """Deshace el paso usando el resultado guardado."""


class CreateUserStep(StepHandler):

    async def execute(
        self,
        saga_id: uuid.UUID,
        user_email: str,
        idempotency_key: str,
        force_fail: bool = False,
    ) -> dict:
        if force_fail:
            raise RuntimeError("Forced failure on create_user")

        await asyncio.sleep(0.3)

        user_id = str(uuid.uuid4())
        return {
            "user_id": user_id,
            "email": user_email,
            "created": True,
        }

    async def compensate(
        self,
        saga_id: uuid.UUID,
        step_result: dict,
    ) -> None:
        user_id = step_result.get("user_id")
        # En producción: UPDATE users SET status='INACTIVE' WHERE id=user_id
        await asyncio.sleep(0.1)
        print(f"[COMPENSATE] User {user_id} marked as INACTIVE")


class ConnectQuickBooksStep(StepHandler):

    def __init__(self):
        self.service = MockQuickBooksService()

    async def execute(
        self,
        saga_id: uuid.UUID,
        user_email: str,
        idempotency_key: str,
        force_fail: bool = False,
    ) -> dict:
        if force_fail:
            raise RuntimeError("Forced failure on connect_quickbooks")

        return await self.service.exchange_token(
            user_email=user_email,
            idempotency_key=idempotency_key,
        )

    async def compensate(
        self,
        saga_id: uuid.UUID,
        step_result: dict,
    ) -> None:
        access_token = step_result.get("access_token")
        await self.service.revoke_token(access_token)
        print(f"[COMPENSATE] QuickBooks token {access_token[:12]}... revoked")


class ConnectPlaidStep(StepHandler):

    def __init__(self):
        self.service = MockPlaidService()

    async def execute(
        self,
        saga_id: uuid.UUID,
        user_email: str,
        idempotency_key: str,
        force_fail: bool = False,
    ) -> dict:
        if force_fail:
            raise RuntimeError("Forced failure on connect_plaid")

        return await self.service.exchange_public_token(
            user_email=user_email,
            idempotency_key=idempotency_key,
        )

    async def compensate(
        self,
        saga_id: uuid.UUID,
        step_result: dict,
    ) -> None:
        item_id = step_result.get("item_id")
        await self.service.remove_item(item_id)
        print(f"[COMPENSATE] Plaid item {item_id} removed")


STEP_REGISTRY: dict[str, StepHandler] = {
    "create_user": CreateUserStep(),
    "connect_quickbooks": ConnectQuickBooksStep(),
    "connect_plaid": ConnectPlaidStep(),
}