from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from typing import Dict, List

import redis
import time

from backend.core.config import settings
from backend.helpers.LoggingHelper import LoggingHelper as logger


# TODO: Fix redis bug....
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Security Middleware to limit request rate based on client IP address.
    Limits the number of requests a client can make within a minute.
    """

    def __init__(self, app):
        super().__init__(app)
        self.redis_url = settings.REDIS_URL
        self.rate_limit = settings.RATE_LIMIT_PER_MINUTE
        self.redis = None
        self.redis_available = False
        self.fallback_storage: Dict[str, List[float]] = {}

        # connect to redis or use fallback
        try:
            self.redis = redis.from_url(self.redis_url, socket_connect_timeout=2)
            self.redis.ping()
            self.redis_available = True
            logger.info("Redis connection established successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using in-memory fallback for rate limiting.")

    async def dispatch(self, request: Request, call_next):
        # Skip routes that start with /static (not using api endpoint) or as example /health
        if request.url.path.startswith("/static") or request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host
        remaining = self.rate_limit

        if self.redis_available:
            try:
                key = f"rate_limit:{client_ip}"
                count = self.redis.get(key)
                count = int(count) if count else 0

                if count >= self.rate_limit:
                    return JSONResponse(
                        status_code=429,
                        content={
                            "detail": f"Rate limit exceeded. Maximum {self.rate_limit} requests per minute allowed"}
                    )

                pipe = self.redis.pipeline()
                pipe.incr(key)
                if count == 0:
                    pipe.expire(key, 60)
                pipe.execute()

                remaining = max(0, self.rate_limit - count - 1)
            except Exception as e:
                logger.error(f"Error using Redis for rate limiting: {e}")
                self.redis_available = False
                logger.warning("Switching to in-memory fallback for rate limiting")

        if not self.redis_available:
            current_time = time.time()
            if client_ip not in self.fallback_storage:
                self.fallback_storage[client_ip] = []

            self.fallback_storage[client_ip] = [
                ts for ts in self.fallback_storage[client_ip]
                if current_time - ts < 60
            ]

            if len(self.fallback_storage[client_ip]) >= self.rate_limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": f"Rate limit exceeded. Maximum {self.rate_limit} requests per minute allowed"}
                )

            # Add current timestamp
            self.fallback_storage[client_ip].append(current_time)
            remaining = max(0, self.rate_limit - len(self.fallback_storage[client_ip]))

            # Continue with the request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response

