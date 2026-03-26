from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers import auth, vault, compare, admin,certificates

app = FastAPI(
    title       = "PINIT API",
    description = "Image Forensics & Verification Platform",
    version     = "1.0.0"
)

# CORS — allow React frontend to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "https://image-crypto-analyzer.vercel.app"
],
    allow_credentials =True,
    allow_methods     = ["*"],
    allow_headers     = ["*"]
)

# Register all routers
app.include_router(auth.router,    prefix="/auth")
app.include_router(vault.router,   prefix="/vault")
app.include_router(compare.router, prefix="/compare")
app.include_router(admin.router,   prefix="/admin")
app.include_router(certificates.router, prefix="/certificates")


@app.get("/")
def root():
    return {
        "app"     : "PINIT API",
        "status"  : "running",
        "docs"    : "/docs"
    }


@app.get("/health")
def health():
    return {"status": "ok"}