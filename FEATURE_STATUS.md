# Feature Status

Labels: **FIV** = Fully implemented and verified · **IU** = Implemented but unverified · **PI** = Partially implemented · **MISS** = Missing · **FIX** = Needs correction.
"Verified" means actually executed successfully. Nothing backend-side has been executed yet, so no backend feature can be FIV until `mvn verify` has run.

## Backend
| Feature | Status | Notes |
|---|---|---|
| Flyway schema V1 (39 tables) + V2 seed | IU | never applied to Postgres |
| Registration, login, JWT, refresh rotation + reuse detection, logout, change password, lockout, rate limit | IU | `AuthSecurityIT` written, not run |
| Forgot/reset password, email verification | MISS | tables only |
| Roles SUPER_ADMIN, ADMIN, INVENTORY_MANAGER, WAREHOUSE_STAFF, CUSTOMER | IU | |
| Role SALES_MANAGER | MISS | needs migration V3 |
| Permission-based authorization on admin endpoints | IU | |
| Warehouse-scoped access for WAREHOUSE_STAFF | MISS | |
| User / role / permission management API | MISS | |
| Categories, products, search/filter/sort/page, soft delete, price-change audit | IU | |
| Product images (magic-byte validation), CSV import/export | IU | |
| Warehouses, inventory, movements, adjustments, low-stock | IU | |
| Atomic warehouse transfer | IU | `InventoryConcurrencyIT` covers it, not run |
| Reorder-level management (per row) | PI | stored and used for low-stock; no update endpoint |
| Out-of-stock identification | PI | derivable (available = 0); no dedicated endpoint |
| Stock reservation / release / commit with locking | IU | concurrency test written, not run |
| Cart, addresses | IU | |
| Order placement (idempotent), cancel, status transitions, history, expiry job | IU | `OrderFlowIT` written, not run |
| Order search/filter (status, dates, order number) | IU | admin only |
| Order tracking / shipments | MISS | tables only |
| Payments (mock gateway), retry, idempotent settle, compensation, refunds | IU | |
| Payment transaction history endpoint | PI | single-payment GET only; no list |
| Suppliers, supplier-products | MISS | tables only |
| Purchase orders, approval, goods receipt (partial), duplicate-receipt protection | MISS | tables only |
| Returns and refunds workflow, conditional restock | MISS | tables only |
| Notifications (in-app + email provider abstraction) | MISS | table only |
| Audit logging (writes) | IU | covers adjust, transfer, price change, refund, cancel, CSV import |
| Audit log read API | MISS | |
| Dashboard KPIs, sales/inventory analytics | MISS | |
| Forecasting | MISS | |
| Reports (CSV/PDF) | PI | only product CSV export exists |
| Dashboard summary endpoint `GET /admin/dashboard/summary` (SQL aggregates, REPORT_VIEW) | IU | `DashboardSummaryIT` written, not run |
| Structured logging | MISS | plain SLF4J |
| OpenAPI | IU | springdoc configured, never rendered |

## Frontend (redesign, 2026-11-18)
Verified = executed: `tsc --noEmit` clean, **77 / 77 Vitest tests pass (16 files)**, ESLint 0 problems, production build succeeds, `npm audit` 0 vulnerabilities. Nothing has been run against a live backend, so every page's *API integration* is IU; component behaviour, permissions, validation and states are FIV via mocked-service tests.

| Area | Status | Notes |
|---|---|---|
| Design tokens (light + dark CSS variables), Inter font | FIV (theme test) | visual appearance not reviewed in a browser |
| Theme switch, persisted, applied before first paint | FIV | `ThemeContext.test`; pre-paint script in `index.html` |
| App shell: collapsible sidebar, topbar, breadcrumbs, user menu, mobile drawer, skip link | FIV | `DashboardLayout.test`, `Sidebar.test` |
| Permission-aware navigation (no dead links, no unsupported modules) | FIV | `Sidebar.test` |
| Global search (opens product search) | IU | |
| Stock-alerts menu (real low-stock data) | IU | replaces a generic notification centre, which has no backend |
| Dashboard (8 KPIs, 6 charts, 3 activity panels, date range, refresh) | FIV for rendering/empty/error/permissions; IU against backend | needs new `GET /api/v1/admin/dashboard/summary` (backend IU) |
| Storefront catalogue, filters, sort, add to cart | FIV (mocked API) | |
| Product detail | IU | |
| Admin products: table, filters, sort, archive, CSV import/export | IU | |
| Product create/edit form (validation, numeric payload, prefill, update by id) | FIV (mocked API) | `ProductFormDialog.test` |
| Categories CRUD | IU | |
| Warehouses list/create/edit | IU | |
| Inventory: status, metrics, warehouse/low-stock views, adjust, transfer, history link | FIV (mocked API) | |
| Stock movements | IU | |
| Admin orders: filters, sort, status transitions with confirmation | FIV (mocked API) | |
| Order detail (customer + admin): stepper, history, cancel/advance with confirmation | IU | |
| Auth pages (split layout, show/hide password) | FIV | |
| Checkout: server totals, one order + new payment key per retry, COD, address validation | FIV (mocked API) | `CheckoutPage.test` |
| Cart page | IU | |
| Profile + change password (signs out afterwards) | FIV (mocked API) | `ProfilePage.test` |
| Reusable: DataTable, Dialog/ConfirmDialog (focus + Tab trap), SearchInput (debounce, external reset), StatCard, ChartCard | FIV | `DataTable/Dialog/SearchInput` tests |

### Pages NOT built (backend has no API for them; deliberately absent from the sidebar)
Customers, Payments list, Suppliers, Purchase Orders, Goods Receipts, Analytics, Forecasting, Reports, Users & Roles, Notifications, Audit Logs, Settings. Dashboard columns "Customer" and order "Items" show `Customer #id` / are omitted because the order DTO has no name or item count; the movements list shows `Product #id` because the movement DTO has no product name.

## Infrastructure
| Item | Status |
|---|---|
| Backend / frontend Dockerfiles, Compose with healthchecks and volumes | IU |
| `.env.example` | IU |
| GitHub Actions (backend verify, frontend test+build, docker build) | IU |
| Frontend lint + type-check + test + build in CI workflow | IU (workflow never executed; each command passes locally) |
| Frontend linting (ESLint + typescript-eslint + react-hooks) | FIV (0 problems) |
| Backend linting (Checkstyle/SpotBugs) | MISS |
| Screenshots | MISS |
