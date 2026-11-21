# Project Audit

Audit date: 2026-11-18. Scope: the repository as delivered in `smart-inventory-system.zip` (v0.2.0).
If you have changed files locally since, re-run this audit against your current tree.

## 0. How this audit was done, and its limits

| Check | Result | Evidence |
|---|---|---|
| Frontend type-check (`tsc --noEmit`) | **Passed** | executed 2026-11-18 |
| Frontend tests (Vitest) | **15 / 15 passed** (3 files) | executed 2026-11-18 |
| Frontend production build | **Passed** (one chunk >500 kB warning) | executed 2026-11-18 |
| `npm audit --omit=dev` | **0 vulnerabilities** | executed 2026-11-18 |
| Backend Maven compile | **NOT RUN** | Maven Central is unreachable from the authoring sandbox |
| Backend unit + integration tests | **NOT RUN** | same reason, and no Docker/Postgres in the sandbox |
| Flyway migrations against real Postgres | **NOT RUN** | no Postgres in the sandbox |
| Hibernate `ddl-auto: validate` against V1 | **NOT RUN** | same |
| Docker Compose build/up | **NOT RUN** | no Docker in the sandbox |
| GitHub Actions workflow | **NOT RUN** | never pushed |
| Backend syntax parse (javac, no dependencies) | Parses; remaining errors are only missing-library/Lombok cascades | executed, but proves syntax only |
| Linting | **No linter is configured** (frontend or backend) | |
| Screenshots | **None exist**; the app has never been started | |

**Consequence:** every backend feature below is *implemented but unverified*. Nothing in this audit should be read as "the backend works".

## 1. Inventory of what exists

- Backend: 102 main + 5 test Java files, 51 REST endpoints (19 GET, 18 POST, 9 PUT, 5 DELETE).
- Schema: V1 creates 39 tables, V2 seeds 5 roles and 12 permissions. 21 entity classes (+2 many-to-many join tables) map 23 of the 39 tables.
- Frontend: 11 page/component files, 3 test files, React 19 / Vite 8 / Tailwind 4.

## 2. Findings (prioritised)

### Critical
| # | Finding | Impact |
|---|---|---|
| C1 | Backend has never been compiled or executed. Lombok-dependent code, Spring Data derived-query names, JPQL and entity/table mappings are all unchecked. | Unknown number of compile or startup failures. Blocks every acceptance criterion. |
| C2 | The 4 integration test classes (concurrency, order flow, auth) have never run. | The core claims (no overselling, idempotency, compensation) are untested assertions of design, not evidence. |
| C3 | Flyway V1 has never been applied to Postgres. | Possible SQL errors (e.g. GIN trigram index on `lower(name)`, partial indexes, CHECKs). |

### High
| # | Finding | Impact |
|---|---|---|
| H1 | 16 tables have no entity/service: suppliers, supplier_products, purchase_orders(+items), goods_receipts(+items), returns(+items), shipments(+history), notifications, notification_preferences, product_reviews, email/password-reset tokens, warehouse_staff. | Whole modules from the brief are missing (see FEATURE_STATUS.md). |
| H2 | No `SALES_MANAGER` role (the upgrade brief requires it). Roles are seeded only in V2. | Needs a new migration (V3), never an edit to V2. |
| H3 | No analytics, reporting, forecasting or PDF generation code exists. | Brief sections 3, 4 unmet. |
| H4 | No user/role/permission management API; no audit-log read API; no settings API. | UI pages 21-24 cannot be built yet. |
| H5 | Frontend covers ~7 of the 25 required pages, and has no design system, dark mode, sidebar shell, charts, or reusable DataTable. | Brief section 5 largely unmet. |
| H6 | Forgot/reset password and email verification are not implemented (register creates an ACTIVE user). | Security gap versus the brief's auth requirements. |
| H7 | Warehouse-staff users can read all warehouses' inventory; the `warehouse_staff` assignment is never consulted. | Authorization gap (least privilege). |

### Medium
| # | Finding |
|---|---|
| M1 | `JwtAuthFilter` loads the user + roles + permissions from the DB on every request. Correct for instant revocation but a hot path; measure before optimising. |
| M2 | Rate limiter is in-memory per instance (documented). |
| M3 | Refund gateway call happens inside a DB transaction (acceptable for the mock; needs an outbox/compensation step for a real gateway). |
| M4 | One order line is fulfilled from one warehouse; no split allocation. |
| M5 | Category filter does not include descendant categories. |
| M6 | No structured (JSON) logging, no correlation/request id. |
| M7 | Frontend now has ESLint (0 problems). Backend still has no Checkstyle/SpotBugs and no dependency-vulnerability scan (OWASP dependency-check or Dependabot). |
| M8 | RESOLVED for the frontend: admin and dashboard routes are lazy-loaded (app chunk 450 kB; dashboard + Recharts 491 kB on demand). |
| M9 | `AuditService` writes but nothing reads; audit rows also lack a before/after for refunds' order state. |
| M10 | No frontend test touches the API layer (no MSW), so product, cart, checkout and admin pages have no tests. |
| M11 | Reservation TTL, shipping fee and free-shipping threshold are config-only; the brief's Settings page needs them in the DB. |

### Low
| # | Finding |
|---|---|
| L1 | Access tokens cannot be revoked before the 15-minute expiry. |
| L2 | `docker-compose.yml` publishes Mailpit and the backend port to the host; fine for dev, remove for production. |
| L3 | CI backend job relies on Docker being present for Testcontainers (true on `ubuntu-latest`). |

## 3. Features that must not break
Order placement idempotency, reservation → commit/release semantics, movement-ledger uniqueness, refresh-token rotation + reuse detection, ownership checks (404 on foreign resources), server-side pricing, historical order snapshots, atomic transfers.

## 4. Security review (design-level, unverified at runtime)
Present by design: BCrypt, short-lived JWT, hashed + rotating refresh tokens with family revocation, lockout, per-IP rate limit on login/register, permission-based `@PreAuthorize`, magic-byte image validation, CSV formula-injection neutralisation, no stack traces in responses, secrets only via environment.
Open: H6, H7, L1, no password-strength denylist, no security headers beyond Spring defaults (add CSP/HSTS at nginx), no dependency scan for the backend.
