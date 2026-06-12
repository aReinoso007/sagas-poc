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


async def get_context():
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