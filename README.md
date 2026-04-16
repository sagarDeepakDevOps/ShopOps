# ShopOps

ShopOps is a full-stack commerce operations platform with customer storefront workflows, admin controls, and integrated observability.

## Project Overview

This repository is organized for production readiness and clear ownership boundaries:

- `backend/`: API, domain services, persistence, migrations, and backend tests
- `frontend/`: React application, unit tests, and browser E2E
- `monitoring/`: Prometheus, Grafana, Jaeger, and ELK config
- `.github/`: CI/CD and security workflows
- `docker-compose.yml`: local full-stack orchestration

## Architecture Diagram

```mermaid
flowchart LR
    FE[Frontend]
    BE[Backend API]
    DB[(PostgreSQL)]
    RD[(Redis)]
    PM[/Prometheus/]
    GF[Grafana]
    JG[Jaeger]
    ELK[ELK Stack]

    FE --> BE
    BE --> DB
    BE --> RD
    BE --> PM
    PM --> GF
    BE --> JG
    BE --> ELK
```

## Folder Structure

```text
.
├── backend/
│   ├── app/
│   ├── tests/
│   ├── alembic/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── alembic.ini
│   ├── .env
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/
│   ├── tests/
│   ├── e2e/
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── .env.example
├── monitoring/
│   ├── prometheus/
│   ├── grafana/
│   ├── jaeger/
│   └── elk/
├── .github/
├── docker-compose.yml
└── README.md
```

## Run Locally

```bash
docker compose up --build
```

## Run Individually

### Frontend Only

```bash
cd frontend
npm install
npm run dev
```

### Backend Only

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

### Frontend

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API path used by frontend API client | `/api/v1` |
| `VITE_BACKEND_ROOT_URL` | Backend root URL for infra endpoints | `https://api.shopops.example` |
| `VITE_BACKEND_TARGET` | Vite dev proxy target | `http://localhost:8000` |

### Backend

| Variable | Description | Example |
| --- | --- | --- |
| `ENVIRONMENT` | Runtime profile | `local` |
| `DEBUG` | Debug mode | `false` |
| `PROJECT_NAME` | API title | `ShopOps` |
| `API_V1_STR` | API prefix | `/api/v1` |
| `SECRET_KEY` | JWT signing key | `change-me-with-32-plus-chars` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `30` |
| `REFRESH_TOKEN_EXPIRE_MINUTES` | Refresh token TTL | `10080` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `DATABASE_URL` | Database URL | `postgresql+asyncpg://shopops:shopops@postgres:5432/shopops` |
| `REDIS_URL` | Redis URL | `redis://redis:6379/0` |
| `BACKEND_CORS_ORIGINS` | Optional explicit CORS list (CSV or JSON array) | `https://a.example,https://b.example` |
| `FRONTEND_URL_LOCAL` | Local allowed origin | `http://localhost:3000` |
| `FRONTEND_URL_STAGING` | Staging allowed origin | `https://staging.shopops.example` |
| `FRONTEND_URL_PRODUCTION` | Production allowed origin | `https://shopops.example` |
| `RATE_LIMIT_DEFAULT` | Global API rate limit | `100/minute` |
| `OTEL_ENABLED` | Enable telemetry | `true` |
| `OTEL_SERVICE_NAME` | Trace service name | `shopops-api` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `http://jaeger:4317` |
| `LOG_LEVEL` | Log level | `INFO` |
| `LOGSTASH_ENABLED` | Enable log shipping | `true` |
| `LOGSTASH_HOST` | Logstash host | `logstash` |
| `LOGSTASH_PORT` | Logstash port | `5000` |

## Available URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1`
- Swagger Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Jaeger: `http://localhost:16686`
- Kibana: `http://localhost:5601`

## API Endpoint Reference

### Auth

| Method | Path | Auth Required | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | No | Register user and return initial token pair |
| POST | `/api/v1/auth/login` | No | Authenticate user and return token pair |
| POST | `/api/v1/auth/refresh` | No | Refresh access and refresh tokens |
| POST | `/api/v1/auth/logout` | No | Stateless logout confirmation |

### Users

| Method | Path | Auth Required | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/users/me` | Yes | Fetch current user profile |
| PATCH | `/api/v1/users/me` | Yes | Update current user profile |
| GET | `/api/v1/users/me/addresses` | Yes | List current user addresses |
| POST | `/api/v1/users/me/addresses` | Yes | Create user address |
| PATCH | `/api/v1/users/me/addresses/{address_id}` | Yes | Update user address |
| DELETE | `/api/v1/users/me/addresses/{address_id}` | Yes | Delete user address |

### Products

| Method | Path | Auth Required | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/products` | No | Paginated product search/filter |
| GET | `/api/v1/products/{product_id}` | No | Fetch product by ID |
| POST | `/api/v1/products` | Admin | Create product |
| PATCH | `/api/v1/products/{product_id}` | Admin | Update product |
| DELETE | `/api/v1/products/{product_id}` | Admin | Delete product |
| GET | `/api/v1/products/categories` | No | List categories |
| POST | `/api/v1/products/categories` | Admin | Create category |
| PATCH | `/api/v1/products/categories/{category_id}` | Admin | Update category |

### Orders

| Method | Path | Auth Required | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/orders` | Yes | List user orders |
| GET | `/api/v1/orders/{order_id}` | Yes | Get order details |
| POST | `/api/v1/orders/checkout` | Yes | Checkout current cart |

### Cart

| Method | Path | Auth Required | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/orders/cart` | Yes | Get active cart |
| POST | `/api/v1/orders/cart/items` | Yes | Add item to cart |
| DELETE | `/api/v1/orders/cart/items/{product_id}` | Yes | Remove item from cart |

### Payments

| Method | Path | Auth Required | Purpose |
| --- | --- | --- | --- |
| POST | `/api/v1/payments/orders/{order_id}/process` | Yes | Run mock payment processing |

### Admin

| Method | Path | Auth Required | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/dashboard` | Admin | Admin KPI dashboard |
| GET | `/api/v1/admin/users` | Admin | List users |
| PATCH | `/api/v1/admin/users/{user_id}/deactivate` | Admin | Deactivate user |
| GET | `/api/v1/admin/orders` | Admin | List orders |
| PATCH | `/api/v1/admin/orders/{order_id}/status` | Admin | Update order status |

### Health and Metrics

| Method | Path | Auth Required | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | No | API health endpoint (versioned) |
| GET | `/health` | No | Root service liveness |
| GET | `/ready` | No | Dependency readiness check |
| GET | `/metrics` | No | Prometheus metrics endpoint |
| GET | `/openapi.json` | No | OpenAPI schema |

## Testing Commands

### Backend

```bash
cd backend
ruff check .
black --check .
isort --check-only .
mypy app
pytest
```

### Frontend

```bash
cd frontend
npm run lint
npm run format
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Deployment Examples

### Frontend to S3 + CloudFront

1. Build frontend artifacts: `cd frontend && npm ci && npm run build`.
2. Upload `frontend/dist` to S3 bucket.
3. Configure CloudFront distribution with S3 origin and SPA fallback (`index.html`).
4. Set runtime API env values at build time (`VITE_API_BASE_URL`, `VITE_BACKEND_ROOT_URL`).

### Backend to EKS

1. Build and push backend image: `docker build -t <registry>/shopops-backend:<tag> ./backend`.
2. Deploy app, postgres/redis dependencies, and migrations as Kubernetes resources.
3. Inject secrets/config via Kubernetes Secrets + ConfigMaps.
4. Expose service via ingress and configure CORS frontend origins by environment variables.

### Full Docker Deployment

1. Ensure backend and frontend env files are configured.
2. Run `docker compose up -d --build`.
3. Validate health endpoints and monitoring dashboards.
