from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, auth, listings, routes, deliveries, matching, feedback, analytics
from db import engine, Base
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="OptiMeal API",
    description="Food rescue logistics platform API",
    version="1.0.0",
    lifespan=lifespan
)

# Get allowed origins from environment or use defaults
default_origins = "http://localhost:3000,https://optimeal-amber.vercel.app"
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", default_origins).split(",")]

# Also allow all for development (comment out in strict production)
if "*" not in ALLOWED_ORIGINS and os.getenv("ALLOW_ALL_ORIGINS", "false").lower() == "true":
    ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy routes (for backward compatibility)
app.include_router(users.router)
app.include_router(auth.router)

# V1 API routes
app.include_router(listings.router)
app.include_router(routes.router)
app.include_router(deliveries.router)
app.include_router(matching.router)
app.include_router(feedback.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {"message": "OptiMeal API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
