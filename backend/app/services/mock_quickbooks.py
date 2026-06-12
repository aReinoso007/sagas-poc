import asyncio
import uuid


class MockQuickBooksService:
    """
    Simula la integración OAuth2 con QuickBooks Online.

    Flujo real:
    1. Frontend abre el OAuth flow de Intuit
    2. Usuario autoriza y QB redirige con un auth_code
    3. Backend intercambia auth_code por access_token + refresh_token
    4. Tokens se guardan encriptados en DB
    """

    async def exchange_token(
        self,
        user_email: str,
        idempotency_key: str,
    ) -> dict:
        # Intuit API tarda entre 200-600ms en ambientes reales
        await asyncio.sleep(0.4)

        return {
            "access_token": f"qb_access_{uuid.uuid4().hex[:16]}",
            "refresh_token": f"qb_refresh_{uuid.uuid4().hex[:16]}",
            "company_id": f"qb_company_{uuid.uuid4().hex[:8]}",
            "expires_in": 3600,
            "connected": True,
        }

    async def revoke_token(self, access_token: str | None) -> None:
        """
        Compensación: revocar tokens OAuth.
        Real: POST https://developer.api.intuit.com/v2/oauth2/tokens/revoke
        """
        if not access_token:
            return
        await asyncio.sleep(0.2)