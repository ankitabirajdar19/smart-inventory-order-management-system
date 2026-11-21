-- Smart Inventory & Order Management System: initial schema.
-- All money is NUMERIC(12,2). All timestamps are TIMESTAMPTZ (stored as UTC).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============ Identity & access ============
CREATE TABLE roles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE);
CREATE TABLE permissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE);
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE','LOCKED','PENDING_VERIFICATION')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ);
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));
CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id));
CREATE TABLE role_permissions (
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id));
CREATE TABLE refresh_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  family_id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_refresh_family ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE TABLE email_verification_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE password_reset_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE addresses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL, phone VARCHAR(20) NOT NULL,
  line1 VARCHAR(200) NOT NULL, line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL, state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(12) NOT NULL, country VARCHAR(100) NOT NULL DEFAULT 'India',
  address_type VARCHAR(20) NOT NULL DEFAULT 'HOME' CHECK (address_type IN ('HOME','WORK','OTHER')),
  default_address BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ);
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE UNIQUE INDEX uq_address_one_default ON addresses(user_id) WHERE default_address AND deleted_at IS NULL;

-- ============ Catalog ============
CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL, slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT, parent_id BIGINT REFERENCES categories(id), image_url VARCHAR(500),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(64) NOT NULL, name VARCHAR(200) NOT NULL, description TEXT, brand VARCHAR(100),
  category_id BIGINT NOT NULL REFERENCES categories(id),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  discount_price NUMERIC(12,2) CHECK (discount_price >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  weight_kg NUMERIC(8,3) CHECK (weight_kg >= 0), dimensions VARCHAR(60), barcode VARCHAR(40),
  min_stock_level INT NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  max_stock_level INT CHECK (max_stock_level >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_discount_le_price CHECK (discount_price IS NULL OR discount_price <= price),
  CONSTRAINT chk_stock_levels CHECK (max_stock_level IS NULL OR max_stock_level >= min_stock_level));
CREATE UNIQUE INDEX uq_products_sku ON products(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id, active);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_name_trgm ON products USING gin (lower(name) gin_trgm_ops);
CREATE TABLE product_images (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_key VARCHAR(255) NOT NULL, content_type VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0, primary_image BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ============ Suppliers & purchasing ============
CREATE TABLE suppliers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL, contact_person VARCHAR(150), email VARCHAR(255), phone VARCHAR(20),
  address TEXT, gstin VARCHAR(15), status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ);
CREATE TABLE supplier_products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id), product_id BIGINT NOT NULL REFERENCES products(id),
  supplier_sku VARCHAR(64), purchase_price NUMERIC(12,2) NOT NULL CHECK (purchase_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, product_id));

-- ============ Warehouses & inventory ============
CREATE TABLE warehouses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL, code VARCHAR(20) NOT NULL UNIQUE, location VARCHAR(150), address TEXT,
  contact_number VARCHAR(20), manager_id BIGINT REFERENCES users(id), active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE warehouse_staff (
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (warehouse_id, user_id));
CREATE TABLE inventory (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),   -- inventory can never go negative
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  reorder_level INT NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, warehouse_id));
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_inventory_available ON inventory(available_quantity);
CREATE TABLE inventory_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN
    ('PURCHASE_IN','SALE_OUT','RESERVATION','RESERVATION_RELEASE','RETURN_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT','TRANSFER_IN','TRANSFER_OUT')),
  quantity INT NOT NULL CHECK (quantity > 0),
  previous_quantity INT NOT NULL, new_quantity INT NOT NULL,        -- available quantity before/after
  previous_reserved INT NOT NULL, new_reserved INT NOT NULL,        -- reserved quantity before/after
  reference_type VARCHAR(30), reference_id BIGINT, reason VARCHAR(255),
  performed_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_movements_product ON inventory_movements(product_id, created_at DESC);
-- Retry safety: the same business event cannot move the same stock row twice.
CREATE UNIQUE INDEX uq_movement_reference ON inventory_movements
  (reference_type, reference_id, movement_type, product_id, warehouse_id) WHERE reference_id IS NOT NULL;
CREATE TABLE stock_transfers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  source_warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  destination_warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  quantity INT NOT NULL CHECK (quantity > 0), reason VARCHAR(255),
  performed_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_warehouse_id <> destination_warehouse_id));

-- ============ Cart & orders ============
CREATE TABLE carts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE cart_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id));
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  shipping_address TEXT NOT NULL, billing_address TEXT NOT NULL,    -- JSON snapshots
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0), discount_total NUMERIC(12,2) NOT NULL CHECK (discount_total >= 0),
  tax_total NUMERIC(12,2) NOT NULL CHECK (tax_total >= 0), shipping_fee NUMERIC(12,2) NOT NULL CHECK (shipping_fee >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  order_status VARCHAR(30) NOT NULL CHECK (order_status IN ('PENDING','CONFIRMED','PROCESSING','PACKED','SHIPPED',
    'OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURN_REQUESTED','RETURNED')),
  payment_status VARCHAR(30) NOT NULL CHECK (payment_status IN ('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
  expires_at TIMESTAMPTZ, version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(order_status, created_at);
CREATE INDEX idx_orders_expiry ON orders(expires_at) WHERE order_status = 'PENDING';
CREATE TABLE order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  product_name VARCHAR(200) NOT NULL, sku VARCHAR(64) NOT NULL,       -- historical snapshots
  list_price NUMERIC(12,2) NOT NULL, unit_price NUMERIC(12,2) NOT NULL, tax_rate NUMERIC(5,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0), line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE TABLE order_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL,
  changed_by BIGINT REFERENCES users(id), note VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_order_history_order ON order_status_history(order_id);

-- ============ Payments ============
CREATE TABLE payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  method VARCHAR(20) NOT NULL CHECK (method IN ('UPI','CREDIT_CARD','DEBIT_CARD','COD','NET_BANKING')),
  status VARCHAR(30) NOT NULL CHECK (status IN ('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  transaction_reference VARCHAR(60) NOT NULL UNIQUE, gateway_reference VARCHAR(100), failure_reason VARCHAR(255),
  idempotency_key VARCHAR(100) NOT NULL UNIQUE, version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE TABLE refunds (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id BIGINT NOT NULL REFERENCES payments(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), reason VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_refunds_payment ON refunds(payment_id);

-- ============ Fulfilment (schema ready; services in later phase) ============
CREATE TABLE shipments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id),
  tracking_number VARCHAR(40) NOT NULL UNIQUE, carrier VARCHAR(80), status VARCHAR(30) NOT NULL,
  estimated_delivery DATE, shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE shipment_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL, note VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE purchase_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_number VARCHAR(30) NOT NULL UNIQUE, supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN
    ('DRAFT','SUBMITTED','APPROVED','REJECTED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0), notes TEXT,
  created_by BIGINT REFERENCES users(id), approved_by BIGINT REFERENCES users(id), approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE purchase_order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  ordered_quantity INT NOT NULL CHECK (ordered_quantity > 0),
  received_quantity INT NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  CHECK (received_quantity <= ordered_quantity));
CREATE TABLE goods_receipts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id),
  warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
  received_by BIGINT REFERENCES users(id), received_at TIMESTAMPTZ NOT NULL DEFAULT now(), notes TEXT);
CREATE TABLE goods_receipt_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goods_receipt_id BIGINT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id BIGINT NOT NULL REFERENCES purchase_order_items(id),
  quantity INT NOT NULL CHECK (quantity > 0));
CREATE TABLE returns (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id), user_id BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN
    ('REQUESTED','APPROVED','REJECTED','PICKUP_SCHEDULED','RECEIVED','INSPECTED','REFUNDED','COMPLETED')),
  reason VARCHAR(500) NOT NULL, refund_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE return_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  return_id BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id BIGINT NOT NULL REFERENCES order_items(id),
  quantity INT NOT NULL CHECK (quantity > 0), condition_note VARCHAR(255),
  restock BOOLEAN NOT NULL DEFAULT FALSE);

-- ============ Engagement ============
CREATE TABLE notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL, title VARCHAR(200) NOT NULL, body TEXT, read_at TIMESTAMPTZ,
  email_status VARCHAR(20) NOT NULL DEFAULT 'NONE', retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
CREATE TABLE notification_preferences (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type VARCHAR(40) NOT NULL,
  in_app BOOLEAN NOT NULL DEFAULT TRUE, email BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, type));
CREATE TABLE product_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id), user_id BIGINT NOT NULL REFERENCES users(id),
  order_item_id BIGINT NOT NULL REFERENCES order_items(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), comment TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_item_id));
CREATE INDEX idx_reviews_product ON product_reviews(product_id);

-- ============ Platform ============
CREATE TABLE idempotency_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope VARCHAR(40) NOT NULL, idem_key VARCHAR(100) NOT NULL, request_hash VARCHAR(64) NOT NULL,
  resource_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, idem_key));
CREATE TABLE audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id), action VARCHAR(60) NOT NULL, module VARCHAR(40) NOT NULL,
  entity_id VARCHAR(64), old_value TEXT, new_value TEXT, ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_audit_module ON audit_logs(module, created_at DESC);
