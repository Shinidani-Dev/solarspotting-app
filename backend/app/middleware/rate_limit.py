from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import redis
import time

from backend.core.config import settings


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
        self.redis = redis.from_url(self.redis_url)

    async def dispatch(self, request: Request, call_next):
        # Skip routes that start with /static (not using api endpoint) or as example /health
        if request.url.path.startswith("/static") or request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host

        key = f"rate_limit:{client_ip}"

        count = self.redis.get(key)
        count = int(count) if count else 0

        if count >= self.rate_limit:
            return HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {self.rate_limit} requests per minute allowed"
            )

        pipe = self.redis.pipeline()
        pipe.incr(key)
        if count == 0:
            pipe.expire(key, 60)
        pipe.execute()

        response = await call_next(request)

        response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.rate_limit - count - 1))

        return response
