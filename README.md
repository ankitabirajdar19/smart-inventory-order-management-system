# Smart Inventory & Order Management System

A full-stack, enterprise-style retail platform: product catalogue, multi-warehouse inventory with concurrency-safe stock
reservation, cart, idempotent order placement, simulated payments with compensation, refunds, and role-based admin tools.

**Stack:** Java 21 · Spring Boot 3.5 · Spring Security + JWT · PostgreSQL 16 · Flyway · React 19 + TypeScript + Vite + Tailwind 4 ·
TanStack Query · React Hook Form + Zod · Docker Compose · GitHub Actions

## Project status (read this first)

This repository is built in phases. **What is implemented and what is not** is listed honestly so you can explain it accurately.

| Area | Status |
|---|---|
| Schema: all 37 required tables + `stock_transfers`, `notification_preferences` (Flyway V1), roles/permissions seed (V2) | Done |
| Auth: register, login, JWT access token, rotating refresh token (HttpOnly cookie) with reuse detection, logout, change password, lockout, rate limiting | Done |
| RBAC: 5 roles, permission-based `@PreAuthorize` on every admin endpoint | Done |
| Categories, products (search/filter/sort/paginate, soft delete, price-change audit), image upload with magic-byte validation, CSV import/export | Done |
| Warehouses, inventory, movements, adjustments, low-stock, atomic warehouse transfer | Done |
| Cart (server-side pricing), addresses (ownership enforced) | Done |
| Orders: idempotent placement, stock reservation, status history, cancel, admin status flow, reservation-expiry scheduler | Done |
| Payments: mock gateway behind `PaymentGateway` strategy, idempotent settle, failure/retry, auto-compensation, partial/full refunds | Done |
| Audit logging (stock adjust, price change, refund, cancellation, CSV import) | Done (no read API yet) |
| Frontend (redesigned): design-token theming with dark mode, collapsible sidebar shell, permission-aware navigation, business dashboard with real aggregates and charts, storefront, cart, checkout, orders, admin products/categories/warehouses/inventory/movements/orders | Done (see `docs/FRONTEND.md`) |
| Dashboard summary API (`GET /api/v1/admin/dashboard/summary`) | Written, backend unverified |
| Tests: backend unit + Testcontainers integration; frontend Vitest | Written; frontend verified, **backend not yet executed** (see below) |
| Email verification, forgot/reset password | Schema only |
| Purchase orders, goods receipt, returns, shipments/tracking, reviews | Schema only |
| Notifications (in-app + email), dashboard analytics, reports, PDF invoices | Not started |
| Supplier module, user/role admin UI, SUPER_ADMIN user management endpoints | Not started |
| Warehouse-staff "assigned warehouse only" restriction | Not started (`warehouse_staff` table exists) |

**Verification status.** The frontend type-checks, passes ESLint (0 problems), builds, and its 77 tests pass (mocked API layer; never run against the live backend). The backend was written without access to Maven
Central, so it has been syntax-checked but **not compiled or run**. Expect to fix a handful of compile or Hibernate-validation
issues on first build; the first command to run is `mvn -f backend/pom.xml verify`. See `docs/testing-guide.md`.

## Quick start

Prerequisites: JDK 21, Maven 3.9+, Node 22, Docker.

```bash
cp .env.example .env                       # edit the secrets
docker compose -f docker-compose.dev.yml --env-file .env up -d     # Postgres + Mailpit

# backend (dev profile seeds demo data)
cd backend
export $(grep -v '^#' ../.env | xargs)
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run

# frontend
cd ../frontend && npm install && npm run dev       # http://localhost:5173
```

Swagger UI: http://localhost:8080/swagger-ui.html · Mailpit: http://localhost:8025

Everything in Docker: `docker compose --env-file .env up --build` → app at http://localhost:8081.

### Demo credentials (local dev profile only)

Password for all: `Password@123` (`app.dev-seed.password`, defined only in `application-dev.yml`).

| Role | Email |
|---|---|
| SUPER_ADMIN | superadmin@example.com |
| ADMIN | admin@example.com |
| INVENTORY_MANAGER | manager@example.com |
| WAREHOUSE_STAFF | staff@example.com |
| CUSTOMER | customer1@example.com, customer2@example.com |

The seed creates 5 categories, 20 products, 2 warehouses and stock (one low-stock and one out-of-stock item). It never runs in `prod`.

## Sample workflows

1. **Purchase:** log in as customer1 → add products → Checkout → add address → Pay → order is `CONFIRMED`; as admin, move it to PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED.
2. **Payment failure:** in dev, tick "Simulate a failed payment" → order stays `PENDING`, stock stays reserved → untick → "Retry payment" succeeds. Unpaid orders are cancelled and stock released after 15 minutes.
3. **Restock:** admin/manager → Inventory → Adjust (+N). Every change appears in `GET /api/v1/admin/inventory/movements`.
4. **Transfer:** `POST /api/v1/admin/inventory/transfers` (see Swagger); both warehouses update in one transaction.

## Documentation

`docs/FRONTEND.md` · `docs/architecture.md` · `docs/database-design.md` · `docs/api-documentation.md` · `docs/business-rules.md` · `docs/testing-guide.md` · `docs/deployment-guide.md`

## Known limitations

- Rate limiting is in-memory per instance. Use Redis/Bucket4j-JCache for multiple instances.
- One order line is fulfilled from a single warehouse (no split allocation across warehouses).
- The refund gateway call happens inside the DB transaction (acceptable for the mock; a real gateway needs an outbox/compensation step).
- Category filtering does not include descendant categories.
- Access tokens are not revocable before expiry (15 min); refresh tokens are.

## Roadmap

Purchase orders and goods receipt → returns → shipments → notifications/email → dashboard & reports → reviews → email verification & password reset.

## License

MIT, see `LICENSE`.
