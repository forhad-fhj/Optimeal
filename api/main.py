from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, listings, routes, deliveries, auth

app = FastAPI(title="OptiMeal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(listings.router)
app.include_router(routes.router)
app.include_router(deliveries.router)
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "OptiMeal API is running"}
