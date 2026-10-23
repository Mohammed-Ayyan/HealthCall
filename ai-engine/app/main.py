"""Main FastAPI application entry point for CareOps AI Engine."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router as api_router
from app.core.config import settings
from app.models.schemas import ErrorDetail, ErrorResponse


# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("careops.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle management."""
    logger.info(
        "Starting %s v%s (Prefix: %s)",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.API_PREFIX,
    )
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title="CareOps AI Engine",
    description="Actionable Intelligence Engine for Healthcare Telephony (Phase 1 Foundation)",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Centralized Error Handlers
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Format Pydantic validation errors cleanly without exposing internals."""
    details = []
    for err in exc.errors():
        # Clean field location (omit 'body' prefix if present)
        loc = [str(x) for x in err.get("loc", []) if x != "body"]
        field_name = ".".join(loc) if loc else "request_body"
        msg = err.get("msg", "Invalid value")
        # Strip internal Pydantic prefixes if present
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        details.append(ErrorDetail(field=field_name, message=msg))

    error_response = ErrorResponse(
        error="Validation Error",
        message="Request payload failed schema validation.",
        details=details,
        status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
    )
    return JSONResponse(
        status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
        content=error_response.model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    """Standardize HTTP exception responses."""
    error_response = ErrorResponse(
        error=f"HTTP {exc.status_code}",
        message=str(exc.detail),
        details=None,
        status_code=exc.status_code,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handle unexpected server exceptions safely without leaking internals or stack traces."""
    # Log exception internally for debugging
    logger.exception("Unhandled server exception processing path: %s", request.url.path)

    # Return sanitized generic error response
    error_response = ErrorResponse(
        error="Internal Server Error",
        message="An unexpected internal error occurred while processing the request.",
        details=None,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump(),
    )


# ============================================================================
# Mount API Router
# ============================================================================

app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
async def root_info() -> dict:
    """Root metadata endpoint directing users to documentation and health check."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "phase": "Phase 1 - Backend Foundation",
        "documentation": f"{settings.API_PREFIX}/docs",
        "health_check": f"{settings.API_PREFIX}/health",
    }
