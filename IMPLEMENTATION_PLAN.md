# Implementation Plan

Principle: **never build new modules on code that has not compiled.** Phase 0 is a hard gate. Every later phase ends with executed tests and an updated FEATURE_STATUS.md.

## Phase 0: Make the existing backend real (GATE, requires a machine with Maven Central + Docker)
1. `mvn -f backend/pom.xml -DskipTests compile` → fix compile errors.
2. Start Postgres, run the app with the dev profile → fix Flyway / Hibernate-validate errors.
3. `mvn -f backend/pom.xml verify` → fix failing tests (do not weaken assertions).
4. `docker compose up --build` and walk the purchase workflow.
5. Push to GitHub and confirm CI is green.
**Exit:** C1-C3 closed; the relevant rows in FEATURE_STATUS.md move IU → FIV with recorded evidence.

## Phase 1: Security and access gaps (V3 migration)
SALES_MANAGER role + permissions; user/role/permission management API; audit-log read API; password reset + email verification (token tables exist) with a local mail provider; warehouse-scoped access for WAREHOUSE_STAFF; reorder-level update endpoint; permission tests.

## Phase 2: Procurement
Suppliers, supplier-products, purchase orders (draft→submitted→approved→partially/fully received), goods receipts. Duplicate-receipt protection via a receipt idempotency key + `received_quantity <= ordered_quantity` check + movement uniqueness (`PURCHASE_IN`, ref `GOODS_RECEIPT`). Tests: double receipt, partial receipts, concurrent receipts.

## Phase 3: Returns and refunds
Return request, approve/reject, receive, inspect, conditional restock (only INSPECTED + resellable), refund through `PaymentService`. Quantity cap against `order_items`. Tests: over-return, damaged not restocked, double inspection.

## Phase 4: Notifications
`NotificationProvider` interface (in-app, SMTP via Mailpit/log fallback), domain events → notifications, preferences, read/unread API, low-stock scheduler, retry job.

## Phase 5: Analytics and reports
SQL aggregation queries (native or projections) with date + warehouse filters: KPIs, sales trends, top products/categories, payment mix, warehouse sales, valuation, movement report, fast/slow/dead stock, turnover. CSV and PDF export (OpenPDF). Indexes only where `EXPLAIN` justifies them (new migration).

## Phase 6: Forecasting
Daily demand series from `order_items` of non-cancelled orders; configurable moving average window; average daily consumption; days of cover; safety stock = z × σ × √lead-time; reorder qty; at-risk list; each recommendation carries its formula inputs; explicit "insufficient history" state (< N days). No ML claims.

## Phase 7: Frontend redesign
App shell (collapsible sidebar, breadcrumbs, profile menu, notification centre, theme tokens + dark mode), reusable `DataTable`, Recharts charts, then pages 2-25 in dependency order. Route-level code splitting. MSW-backed tests per feature area.

## Phase 8: Quality, CI, docs
ESLint + `tsc` step; Checkstyle/SpotBugs (or Error Prone) and OWASP dependency-check/Dependabot; structured JSON logging with request ids; query review for N+1 (Hibernate statistics in tests); CI hardening; screenshots from the running app; docs renamed/aligned with the brief (`ARCHITECTURE.md`, `SECURITY.md`, ...); final reports.

## Rules carried through every phase
New migrations only (V3+), never edit V1/V2 once applied · small commits · tests run before moving on · record every unrun test and why.
