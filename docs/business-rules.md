# Business rules and where they are enforced

| Rule | Application | Database |
|---|---|---|
| Inventory never negative | `InventoryService.move` | `CHECK (available_quantity >= 0)`, `reserved_quantity >= 0` |
| No overselling under concurrency | row lock `FOR UPDATE` + re-check | `@Version` column |
| Unique SKU | `ProductService` | partial unique index on non-deleted rows |
| Only active products purchasable | `CartService`, `OrderService` | - |
| Prices computed server-side | `PriceCalculator` (client totals ignored) | `CHECK (total >= 0)` |
| Historical prices fixed | order item snapshots | NOT NULL snapshot columns |
| Customers see only their own orders/addresses | ownership in queries (404 otherwise) | - |
| Duplicate order requests | `idempotency_records` | `UNIQUE (user_id, scope, idem_key)` |
| Duplicate payments / callbacks | `settle` is a no-op unless `INITIATED` | `UNIQUE (idempotency_key)`, `UNIQUE (transaction_reference)` |
| Failed payment never confirms an order | `settle` | - |
| Cancelling releases reserved stock | `OrderService.cancel`, expiry job | movement uniqueness makes it retry-safe |
| No cancellation after shipment | cancellable set per actor | - |
| Refund cannot exceed paid amount | `PaymentService.refund` under row lock | `CHECK (amount > 0)` |
| Every stock change recorded | `InventoryService.move` | FK + NOT NULL |
| Transfers atomic | one transaction, both rows locked | - |
| Money is `BigDecimal` / `NUMERIC(12,2)` | everywhere | column type |
| UTC timestamps | `Instant`, `jdbc.time_zone=UTC` | `TIMESTAMPTZ` |

Pricing: effective unit price = discount price if set, else list price. Tax = effective line amount x tax rate, rounded HALF_UP per line. Shipping = flat fee (default 50.00) unless the net amount reaches the free threshold (default 1000.00).
