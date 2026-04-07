"""Tenant context middleware for multi-tenancy."""

import logging

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger("prepflow.tenant")


class TenantContextMiddleware(BaseHTTPMiddleware):
    """Extracts tenant context from request and makes it available on request.state."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Try to extract tenant_id from X-Tenant-ID header
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            request.state.tenant_id = tenant_id

        response = await call_next(request)
        return response
