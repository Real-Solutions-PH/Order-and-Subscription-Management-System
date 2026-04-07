# PrepFlow Backend

Order & Subscription Management System — FastAPI Backend API

## Quick Start

```bash
# Install dependencies
uv sync

# Copy env file
cp .env.example .env

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d postgres redis

# Run migrations
uv run alembic upgrade head

# Start dev server
uv run uvicorn app.main:app --reload --port 8000
```

## Development

```bash
# Run all commands from project root with make:
make install-backend   # Install deps
make run-backend-dev   # Start dev server
make lint              # Run linter
make format            # Auto-format code
make test              # Run tests
make migrate           # Run migrations
make docker-up         # Start all services
```

## Architecture

```
app/
├── config.py          # Pydantic Settings
├── deps.py            # Shared FastAPI dependencies
├── main.py            # App factory
├── core/              # Security, cache, events, permissions, exceptions
├── middleware/         # Request logging, tenant context
├── repo/              # Repository layer (db.py models + per-module repos)
├── services/          # Business logic layer
├── routes/v1/         # API route handlers (controllers)
├── schemas/           # Pydantic request/response schemas
└── utils/             # Helpers (slug generation, etc.)
```
