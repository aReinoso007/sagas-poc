import asyncio
import uuid


class MockPlaidService:
    """
    Simula la integración con Plaid Link.

    Flujo real:
    1. Backend crea un link_token via POST /link/token/create
    2. Frontend inicializa Plaid Link con ese token
    3. Usuario selecciona su banco y autoriza
    4. Plaid Link devuelve un public_token al frontend
    5. Frontend envía public_token al backend
    6. Backend hace POST /item/public_token/exchange
       → recibe access_token + item_id
    7. access_token se guarda para futuras llamadas
       a /transactions, /balance, etc.
    """

    async def exchange_public_token(
        self,
        user_email: str,
        idempotency_key: str,
    ) -> dict:
        # Plaid sandbox tarda entre 300-700ms
        await asyncio.sleep(0.5)

        return {
            "access_token": f"access-sandbox-{uuid.uuid4().hex[:20]}",
            "item_id": f"item_{uuid.uuid4().hex[:12]}",
            "account_id": f"acc_{uuid.uuid4().hex[:10]}",
            "institution_name": "Chase Bank (Mock)",
            "connected": True,
        }

    async def remove_item(self, item_id: str | None) -> None:
        """
        Compensación: eliminar el item de Plaid.
        Real: POST /item/remove con el access_token.
        Revoca acceso a todas las cuentas bancarias del usuario.
        """
        if not item_id:
            return
        await asyncio.sleep(0.2)