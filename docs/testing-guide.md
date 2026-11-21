# Testing guide

## Backend
```bash
mvn -f backend/pom.xml verify        # Docker must be running (Testcontainers starts postgres:16-alpine)
```
- `unit/PriceCalculatorTest`: discount, tax rounding, shipping threshold, empty cart.
- `integration/InventoryConcurrencyIT`: 30 threads / 10 units (exactly 10 succeed), opposite transfers in parallel (no deadlock, stock conserved), over-transfer rejected.
- `integration/OrderFlowIT`: idempotent order placement, payment success, duplicate callback, replayed payment key, failure then retry, cancel (pending and confirmed), cancel after shipment rejected, refund limits, stock vanishing mid-checkout, cross-customer access.
- `integration/AuthSecurityIT`: register/duplicate/weak password, login failure, protected endpoints, tampered token, customer vs admin endpoints, refresh rotation and reuse detection.

**Backend status:** these tests (including the new `DashboardSummaryIT`) were written but not executed in the authoring environment (no Maven Central access). Run the command above first and fix any compile or Hibernate schema-validation errors it reports; the tests are the safety net for that.

Not yet covered: purchase orders, returns (modules not implemented), repository-level query tests, expired-JWT test, scheduler test.

## Frontend
```bash
cd frontend && npm run lint && npm run typecheck && npm test              # Vitest + React Testing Library (77 tests in 16 files, passing)
```
Covers: zod schemas; login/registration validation; route guards; permission-based sidebar; theme switching; responsive drawer and sidebar collapse; DataTable (sort, columns, pagination, empty/error/loading); dashboard (KPIs, trend honesty, empty/error states, permission-gated panels); storefront filtering/sorting/add-to-cart; inventory adjust/transfer validation and permissions; admin order filters, transitions and confirmation.
These tests mock the service layer (`src/api/services.ts`), so they prove UI behaviour, not backend integration. Also covered: checkout (one order, new payment key on retry, COD, address validation), product create/edit form, profile and password change, Dialog focus management, SearchInput debounce.
Not yet covered: categories, warehouses, movements, cart and order-detail pages; no browser-level (Playwright) tests.

Bugs these tests/linters found and fixed: (1) `DataTable` crashed when a table had no sort prop; (2) `Dialog` always focused its frame instead of the first field (`a?.focus() ?? b?.focus()`); both have regression tests, and the Dialog test was confirmed to fail on the old code.
Test-run note: dashboard tests print a Recharts width/height(0) notice because jsdom has no layout engine; it is a test-environment artifact.
