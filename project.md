Build a production-grade backend project named **ShopOps **using Python FastAPI.

## Goal

Create a modern enterprise-level e-commerce backend application that I can use to practice GitHub certifications (GH-900, GH-200, GH-100), CI/CD, DevOps, security scanning, observability, and deployment workflows.

## Core Stack

* Python 3.12+
* FastAPI
* PostgreSQL
* SQLAlchemy (async)
* Alembic migrations
* Pydantic v2
* Pytest
* Redis (for caching / background jobs if needed)
* Docker + Docker Compose
* Uvicorn / Gunicorn
* OpenTelemetry
* Prometheus metrics
* Structured JSON logging

## Architecture Requirements

Use clean production-ready architecture:

/app
/api
/core
/models
/schemas
/services
/repositories
/middleware
/db
/telemetry
/tests

Use:

* Dependency Injection patterns
* Environment-based config
* .env support
* Separation of concerns
* SOLID principles
* Type hints everywhere
* Clean modular code
* Production-ready folder structure

## Functional Modules

### Authentication

* JWT access token + refresh token
* Register / Login / Logout
* Password hashing
* Role-based access (admin, customer)

### Users

* User profile
* Update profile
* Address management

### Products

* CRUD products
* Categories
* Inventory stock
* Product search
* Pagination
* Filtering
* Sorting

### Orders

* Cart system
* Add/remove items
* Checkout
* Order placement
* Order history
* Order status

### Payments

* Mock payment gateway
* Payment success/failure states

### Admin

* Dashboard APIs
* Manage users
* Manage products
* View orders

## Database

Use PostgreSQL with:

* Proper indexes
* Constraints
* Relationships
* UUID primary keys
* Timestamps
* Soft delete where useful

Support:

* local database
* production external DB connection

## Quality & Testing

Add:

* Pytest unit tests
* Integration tests
* API tests
* Minimum 80% coverage
* Fixtures
* Test database setup

## Code Quality

Configure:

* Ruff
* Black
* isort
* mypy
* pre-commit hooks

## Security

Implement:

* Input validation
* Rate limiting
* CORS config
* Security headers
* SQL injection safe ORM use
* Secret via env vars only
* Dependency pinning

## Observability

Integrate OpenTelemetry fully.

Need:

### Traces

* Request traces
* DB query spans
* Custom spans

### Metrics

* Request count
* Latency
* Error rate
* CPU/memory compatible metrics

### Logs

* JSON logs
* Correlation ID
* Request logs
* Error logs

Export compatible with:

* Prometheus
* Grafana
* Jaeger / Tempo

## Docker

Create:

* Dockerfile
* docker-compose.yml

Services:

* app
* postgres
* redis
* prometheus
* grafana
* jaeger

## GitHub Setup

Create complete .github folder.

### GitHub Actions workflows:

1. CI pipeline:

* lint
* format check
* tests
* coverage
* build docker image

2. Security pipeline:

* CodeQL
* dependency review
* secret scan
* container scan

3. CD pipeline:
* leave it blank


## Documentation

Generate:

* README.md professional quality and inclue:
  - API docs usage
  - local setup steps
  - deployment steps
  - architecture diagram in markdown

## Deliverables

Generate full source code file by file.

Start with:

1. project tree
2. requirements
3. docker setup
4. app core files
5. models
6. routes
7. tests
8. GitHub Actions
9. docs

Do not generate toy code. Generate real production-quality code.

Use latest stable versions.
