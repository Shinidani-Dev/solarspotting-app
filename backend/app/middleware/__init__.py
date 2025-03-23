from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.app.middleware.rate_limit import RateLimitMiddleware


def setup_middlewares(app: FastAPI):
    """
    Setup all middlewares for the application. Registers all middlewares to the app
    Args:
        app: the FASTAPI application
    """

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
    if settings.USE_RATE_LIMITER:
        app.add_middleware(RateLimitMiddleware)
