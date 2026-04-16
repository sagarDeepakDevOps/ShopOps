# ShopOps Backend

FastAPI backend for ShopOps commerce operations.

## Stack

- FastAPI + Uvicorn + Gunicorn
- SQLAlchemy (async) + Alembic
- PostgreSQL + Redis
- OpenTelemetry + Prometheus metrics
- Pytest + Ruff + Black + Isort + Mypy

## Run Locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run in Docker

```bash
docker build -t shopops-backend ./backend
docker run --rm -p 8000:8000 --env-file ./backend/.env shopops-backend
```

## Environment Variables

| Variable | Description |
| --- | --- |
| `ENVIRONMENT` | Runtime environment (`local`, `staging`, `production`) |
| `DEBUG` | Enable debug mode |
| `PROJECT_NAME` | FastAPI project title |
| `API_V1_STR` | API prefix |
| `SECRET_KEY` | JWT signing key (>=32 chars) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | Refresh token TTL |
| `DATABASE_URL` | Async SQLAlchemy database URL |
| `REDIS_URL` | Redis connection URL |
| `BACKEND_CORS_ORIGINS` | Optional explicit CORS origins list (CSV or JSON array) |
| `FRONTEND_URL_LOCAL` | Local frontend origin |
| `FRONTEND_URL_STAGING` | Staging frontend origin |
| `FRONTEND_URL_PRODUCTION` | Production frontend origin |
| `RATE_LIMIT_DEFAULT` | Default API rate limit |
| `OTEL_ENABLED` | Enable tracing |
| `OTEL_SERVICE_NAME` | Service name for telemetry |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint |
| `LOG_LEVEL` | Structured log level |
| `LOGSTASH_ENABLED` | Enable Logstash transport |
| `LOGSTASH_HOST` | Logstash host |
| `LOGSTASH_PORT` | Logstash port |

## Quality Commands

```bash
ruff check .
black --check .
isort --check-only .
mypy app
pytest
```
