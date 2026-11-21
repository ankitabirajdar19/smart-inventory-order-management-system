# API

Base path `/api/v1`. Interactive docs: `/swagger-ui.html` (click *Authorize*, paste the access token). Responses use `{ success, message, data, timestamp }`; errors use `{ timestamp, status, code, message, path, details[] }`.
State-changing order/payment calls require an `Idempotency-Key` header (max 100 chars).

| Area | Endpoints | Access |
|---|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | public |
| Me | `GET/PUT /users/me`, `PUT /users/me/password` | authenticated |
| Catalogue | `GET /products`, `/products/{id}`, `/categories` | public |
| Products | `GET/POST /admin/products`, `PUT/DELETE /admin/products/{id}`, `POST /admin/products/{id}/images`, `POST /admin/products/import`, `GET /admin/products/export` | `PRODUCT_WRITE` |
| Categories | `GET/POST /admin/categories`, `PUT/DELETE /admin/categories/{id}` | `CATEGORY_WRITE` |
| Warehouses | `GET/POST /admin/warehouses`, `PUT /admin/warehouses/{id}`, `GET /admin/warehouses/{id}/inventory` | `INVENTORY_READ` / `WAREHOUSE_MANAGE` |
| Inventory | `GET /admin/inventory`, `/admin/inventory/low-stock`, `/admin/inventory/movements`; `POST /admin/inventory/adjustments`, `/admin/inventory/transfers` | `INVENTORY_READ` / `INVENTORY_WRITE` |
| Cart | `GET /cart`, `POST /cart/items`, `PUT/DELETE /cart/items/{id}`, `DELETE /cart` | CUSTOMER |
| Addresses | `GET/POST /addresses`, `PUT/DELETE /addresses/{id}`, `PUT /addresses/{id}/default` | CUSTOMER |
| Orders | `POST /orders`, `GET /orders`, `GET /orders/{id}`, `POST /orders/{id}/cancel` | CUSTOMER |
| Orders (admin) | `GET /admin/orders` (status, from, to, orderNumber), `GET /admin/orders/{id}`, `PUT /admin/orders/{id}/status` | `ORDER_READ_ALL` / `ORDER_MANAGE` or `ORDER_FULFIL` |
| Dashboard | `GET /admin/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` (default last 30 days, max 366) | `REPORT_VIEW` |
| Payments | `POST /payments`, `GET /payments/{id}`, `POST /payments/{id}/retry`, `POST /payments/{id}/refund` | CUSTOMER / `PAYMENT_REFUND` |

Not yet implemented: suppliers, purchase orders, returns, shipments/tracking, notifications, reviews, reports, forgot/reset password, email verification, admin user management.

## Example
```http
POST /api/v1/orders
Authorization: Bearer <token>
Idempotency-Key: 6d1f6c0a-3c4b-4c3e-9d57-0d0f2a9c1b11
{ "addressId": 3 }
```
`201` → order in `PENDING` with server-calculated totals. Re-sending the same key returns the same order.
`409 INSUFFICIENT_STOCK` → nothing was created or reserved.

## Dashboard summary (added for the redesigned UI)
Why it exists: KPIs such as inventory value, revenue, daily series and top products cannot be computed correctly from paginated list endpoints. The endpoint is read-only, uses plain SQL aggregates, and is protected by `REPORT_VIEW`.
Definitions: *revenue* = sum of order totals for orders that reached `CONFIRMED` or later (excludes `PENDING`, `CANCELLED`, returns); *inventory value* = (available + reserved) x effective price; *low/out-of-stock* are counted per inventory record (product x warehouse); trends compare against the immediately preceding period of equal length and are `null` in the UI when the previous value is zero.
