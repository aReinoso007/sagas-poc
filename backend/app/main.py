from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.core.database import AsyncSessionLocal, engine, Base
from app.graphql.schema import schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


class Context:
    def __init__(self):
        self.db = None

    async def __aenter__(self):
        self.db = AsyncSessionLocal()
        return {"db": self.db}

    async def __aexit__(self, *args):
        await self.db.close()


async def get_context() -> dict:
    async with AsyncSessionLocal() as db:
        yield {"db": db}


graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context,
    graphiql=True,
)

app = FastAPI(title="SAGA Onboarding POC", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graphql_router, prefix="/graphql")


@app.get("/health")
async def health():
    return {"status": "ok"}