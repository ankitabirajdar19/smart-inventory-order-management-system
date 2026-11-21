# Frontend

React 19 + TypeScript + Vite + Tailwind 4, TanStack Query, React Hook Form + Zod, Recharts (the only new chart dependency) and `@fontsource-variable/inter`.

## Design system
All colours are CSS variables in `src/index.css` (`:root` light, `.dark` dark) exposed to Tailwind through `@theme inline` (`bg-surface`, `text-muted`, `border-line`, `bg-accent`, ...). No component hard-codes a palette colour, so light/dark and charts stay consistent. The saved theme is applied by a tiny script in `index.html` before first paint.
Light: bg `#F6F7FB`, surface `#FFFFFF`, text `#172033`, accent `#4F46E5`. Dark: bg `#0B1120`, cards `#151F32`, accent `#818CF8`.

## Structure
- `components/ui.tsx`: Button, Input, Select, Checkbox, Card, Badge/StatusBadge, Skeleton, Spinner, EmptyState, ErrorState, Pagination, Toasts.
- `components/common/`: DataTable, Dialog/ConfirmDialog (focus trap, Esc, labelled), Dropdown, SearchInput (debounced), PageHeader/FilterBar.
- `components/layout/`: DashboardLayout, Sidebar, Topbar, Breadcrumbs, UserMenu, AlertsMenu.
- `components/dashboard/`: StatCard, ChartCard, Charts (Recharts), Panels.
- `api/services.ts`: typed wrappers; every path exists in a Spring controller. `api/client.ts` keeps JWT-in-memory + cookie refresh.
- `lib/nav.ts`: single source for navigation; items are filtered by permission and only list routes that exist.

## Routes and permissions (UI guards; the backend enforces independently)
| Route | Requires |
|---|---|
| `/`, `/products/:id`, `/login`, `/register` | public (staff are redirected from `/` to their first admin page) |
| `/cart`, `/checkout`, `/orders`, `/orders/:id` | CUSTOMER |
| `/profile` | signed in |
| `/admin/dashboard` | REPORT_VIEW |
| `/admin/products` | PRODUCT_WRITE or INVENTORY_READ (edit actions need PRODUCT_WRITE) |
| `/admin/categories` | CATEGORY_WRITE |
| `/admin/inventory`, `/admin/warehouses`, `/admin/movements` | INVENTORY_READ (adjust/transfer need INVENTORY_WRITE, warehouse edit needs WAREHOUSE_MANAGE) |
| `/admin/orders`, `/admin/orders/:id` | ORDER_READ_ALL (status changes need ORDER_MANAGE or ORDER_FULFIL) |

## Truthfulness rules followed
- Dashboard numbers come from `GET /admin/dashboard/summary`; if it fails the cards show "Unavailable", never placeholders. Trends are computed from the previous period and show "No prior-period data" when the baseline is zero.
- Stock is never calculated in the browser; adjust/transfer/cancel call the backend, which re-validates under row locks. The "cannot remove more than available" check is a convenience only.
- No navigation to unsupported modules (see FEATURE_STATUS.md).

## Known limitations
- Never viewed in a browser or against the live backend: visual polish, the 1440 to 375 px responsive behaviour and API integration are unverified. No screenshots exist.
- Order/movement DTOs lack customer names, item counts and product names, so the UI shows ids.
- Product list responses carry no image URL, so catalogue tiles use an icon; images appear on the detail page.
- Inventory has no text search (the API has none); admin orders search is exact order number.
- TypeScript is pinned to 6.0.x because `typescript-eslint` does not yet support TypeScript 7 (peer range `<6.1`). Revisit when it does.
- ESLint uses the React Hooks (compiler-aware) rules; it already caught a real focus bug and a render-purity issue.
