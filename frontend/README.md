# ShopOps Frontend

React + TypeScript frontend for the ShopOps commerce platform.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Hook Form + Zod
- Zustand
- Jest + React Testing Library
- Playwright

## Local Development

```bash
npm install
npm run dev
```

Default app URL: `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env` and adjust values per environment.

| Variable                | Description                                                   | Example                       |
| ----------------------- | ------------------------------------------------------------- | ----------------------------- |
| `VITE_API_BASE_URL`     | API base path used by the frontend HTTP client                | `/api/v1`                     |
| `VITE_BACKEND_ROOT_URL` | Backend root URL for infra endpoints (health/metrics/openapi) | `https://api.shopops.example` |
| `VITE_BACKEND_TARGET`   | Local Vite proxy target for development                       | `http://localhost:8000`       |

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
npm run typecheck
npm run test
npm run test:e2e
```

## Testing

Unit/integration tests:

```bash
npm run test
```

Browser E2E:

```bash
npx playwright install chromium
npm run test:e2e
```

Useful E2E overrides:

- `E2E_BASE_URL`
- `E2E_PGHOST`
- `E2E_PGPORT`
- `E2E_PGUSER`
- `E2E_PGPASSWORD`
- `E2E_PGDATABASE`
