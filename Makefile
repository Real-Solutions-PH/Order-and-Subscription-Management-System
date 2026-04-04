# ============================================================================
# PrepFlow — Order & Subscription Management System
# ============================================================================

.PHONY: help install dev backend frontend lint lint-backend lint-frontend lint-fix format format-backend format-frontend format-check test migrate docker-up docker-down clean

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Setup -------------------------------------------------------------------

install: ## Install all dependencies (frontend + backend)
	cd frontend && npm install
	cd backend && uv sync

install-backend: ## Install backend dependencies only
	cd backend && uv sync

install-frontend: ## Install frontend dependencies only
	cd frontend && npm install

# --- Development -------------------------------------------------------------

dev: ## Start both frontend and backend in dev mode
	$(MAKE) -j2 run-frontend-dev run-backend-dev

run-frontend-dev: ## Start Next.js dev server (port 3000)
	cd frontend && npm run dev

run-backend-dev: ## Start FastAPI dev server (port 8000)
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

backend: run-backend-dev ## Alias for run-backend-dev
frontend: run-frontend-dev ## Alias for run-frontend-dev

# --- Code Quality ------------------------------------------------------------

lint: ## Run linters on backend and frontend
	cd backend && uv run ruff check app/
	cd frontend && npm run lint

lint-backend: ## Run linter on backend code only
	cd backend && uv run ruff check app/

lint-frontend: ## Run ESLint on frontend code only
	cd frontend && npm run lint

lint-fix: ## Auto-fix lint issues (backend + frontend)
	cd backend && uv run ruff check --fix app/
	cd frontend && npm run lint:fix

format: ## Auto-format backend and frontend code
	cd backend && uv run ruff format app/
	cd frontend && npm run format

format-backend: ## Auto-format backend code only
	cd backend && uv run ruff format app/

format-frontend: ## Auto-format frontend code only
	cd frontend && npm run format

format-check: ## Check formatting without writing (backend + frontend)
	cd backend && uv run ruff format --check app/
	cd frontend && npm run format:check

typecheck: ## Run mypy type checker on backend
	cd backend && uv run mypy app/

check: lint format-check typecheck ## Run all code quality checks

# --- Testing -----------------------------------------------------------------

test: ## Run backend tests
	cd backend && uv run pytest -v

test-cov: ## Run backend tests with coverage
	cd backend && uv run pytest --cov=app --cov-report=term-missing

# --- Database ----------------------------------------------------------------

migrate: ## Run Alembic migrations (upgrade to head)
	cd backend && uv run alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create msg="add users table")
	cd backend && uv run alembic revision --autogenerate -m "$(msg)"

migrate-downgrade: ## Downgrade one migration
	cd backend && uv run alembic downgrade -1

migrate-history: ## Show migration history
	cd backend && uv run alembic history

# --- Docker ------------------------------------------------------------------

docker-up: ## Start all services via Docker Compose
	cd backend && docker compose up -d

docker-down: ## Stop all Docker services
	cd backend && docker compose down

docker-build: ## Build Docker images
	cd backend && docker compose build

docker-logs: ## Tail Docker logs
	cd backend && docker compose logs -f

docker-db: ## Start only database and Redis
	cd backend && docker compose up -d postgres redis

# --- Utilities ---------------------------------------------------------------

clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true

env: ## Copy .env.example to .env (if not exists)
	@test -f backend/.env || cp backend/.env.example backend/.env && echo "Created backend/.env"
