CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(16) UNIQUE,
  email VARCHAR(254),
  password_hash TEXT,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  coin_balance INTEGER NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(254);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coin_balance INTEGER NOT NULL DEFAULT 0 CHECK (coin_balance >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_name_login_idx ON users(LOWER(BTRIM(name))) WHERE password_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requests_in_window SMALLINT NOT NULL DEFAULT 1 CHECK (requests_in_window >= 1 AND requests_in_window <= 5),
  consumed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  phone_e164 VARCHAR(16) PRIMARY KEY,
  code_hash TEXT NOT NULL,
  display_name VARCHAR(120),
  expires_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  email VARCHAR(254) PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  admin_email VARCHAR(254) REFERENCES admins(email) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CHECK ((user_id IS NOT NULL) <> (admin_email IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS user_sessions_user_expiry_idx ON user_sessions (user_id, expires_at) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_sessions_admin_expiry_idx ON user_sessions (admin_email, expires_at) WHERE admin_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(16) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  pincode VARCHAR(6) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_addresses_owner_expiry_idx ON user_addresses(user_id, expires_at DESC);

-- Delivery addresses belong to the customer until they remove or replace them.
ALTER TABLE user_addresses ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE user_addresses ALTER COLUMN expires_at SET DEFAULT NULL;
UPDATE user_addresses SET expires_at = NULL WHERE expires_at IS NOT NULL;
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  subcategory VARCHAR(100),
  business VARCHAR(24) NOT NULL CHECK (business IN ('stationery', 'cctv', 'furniture')),
  brand VARCHAR(100) NOT NULL DEFAULT '',
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  mrp NUMERIC(12,2) NOT NULL CHECK (mrp >= price),
  unit VARCHAR(80) NOT NULL,
  image TEXT NOT NULL,
  badge VARCHAR(60),
  description TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  gst NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (gst >= 0 AND gst <= 100),
  sku VARCHAR(80) NOT NULL UNIQUE,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- Older deployments stored galleries as PostgreSQL text arrays. Product writes
-- now send JSON, so convert the existing values instead of leaving the legacy
-- column type in place when ADD COLUMN IF NOT EXISTS is a no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'products'
      AND column_name = 'gallery'
      AND udt_name = '_text'
  ) THEN
    ALTER TABLE products ALTER COLUMN gallery DROP DEFAULT;
    ALTER TABLE products ALTER COLUMN gallery TYPE JSONB USING to_jsonb(gallery);
    ALTER TABLE products ALTER COLUMN gallery SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS storefront_categories (
  slug VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  name_ta VARCHAR(120) NOT NULL DEFAULT '',
  icon VARCHAR(24) NOT NULL DEFAULT '📦',
  image TEXT,
  tagline VARCHAR(300) NOT NULL DEFAULT '',
  badge VARCHAR(80),
  subcategories JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_category_active_idx ON products (category, active);
CREATE INDEX IF NOT EXISTS products_business_active_idx ON products (business, active);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(32) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(16) NOT NULL,
  email VARCHAR(254),
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  pincode VARCHAR(12) NOT NULL,
  gstin VARCHAR(20),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  coupon_code VARCHAR(40),
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  tax NUMERIC(12,2) NOT NULL CHECK (tax >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  customer_type VARCHAR(16) NOT NULL DEFAULT 'retail' CHECK (customer_type IN ('retail', 'wholesale')),
  pricing_version SMALLINT NOT NULL DEFAULT 1,
  status VARCHAR(24) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  payment_method VARCHAR(16) NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('upi', 'card', 'cod')),
  payment_status VARCHAR(24) NOT NULL DEFAULT 'due_on_delivery' CHECK (payment_status IN ('pending', 'paid', 'failed', 'due_on_delivery', 'refunded')),
  coins_earned INTEGER NOT NULL DEFAULT 0 CHECK (coins_earned >= 0),
  coins_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (coins_redeemed >= 0),
  coins_refunded INTEGER NOT NULL DEFAULT 0 CHECK (coins_refunded >= 0),
  delivery_latitude DOUBLE PRECISION,
  delivery_longitude DOUBLE PRECISION,
  driver_latitude DOUBLE PRECISION,
  driver_longitude DOUBLE PRECISION,
  driver_location_updated_at TIMESTAMPTZ,
  shipping_provider VARCHAR(120),
  tracking_number VARCHAR(160),
  tracking_url TEXT,
  delivery_driver_name VARCHAR(120),
  delivery_driver_phone VARCHAR(16),
  estimated_delivery_at TIMESTAMPTZ,
  customer_notes TEXT,
  admin_notes TEXT,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_type VARCHAR(16) NOT NULL DEFAULT 'retail' CHECK (customer_type IN ('retail', 'wholesale'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_version SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(16) NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('upi', 'card', 'cod'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(24) NOT NULL DEFAULT 'due_on_delivery' CHECK (payment_status IN ('pending', 'paid', 'failed', 'due_on_delivery', 'refunded'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coins_earned INTEGER NOT NULL DEFAULT 0 CHECK (coins_earned >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coins_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (coins_redeemed >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coins_refunded INTEGER NOT NULL DEFAULT 0 CHECK (coins_refunded >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_latitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_longitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_provider VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(160);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_driver_name VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_driver_phone VARCHAR(16);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(180) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  gst_rate NUMERIC(5,2) NOT NULL CHECK (gst_rate >= 0 AND gst_rate <= 100),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0)
);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image TEXT;
UPDATE order_items oi SET product_image = p.image FROM products p WHERE oi.product_id = p.id AND oi.product_image IS NULL;

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID UNIQUE REFERENCES orders(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  reason VARCHAR(240) NOT NULL,
  admin_email VARCHAR(254) REFERENCES admins(email) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coin_transactions_user_created_idx ON coin_transactions(user_id, created_at DESC);

-- Seed one-time rewards for already-delivered orders; the unique order_id makes this idempotent.
INSERT INTO coin_transactions(user_id,order_id,amount,balance_after,reason)
SELECT o.user_id,o.id,FLOOR(o.total / 100)::int,0,'Order delivered reward'
FROM orders o
WHERE o.status='delivered' AND o.user_id IS NOT NULL AND o.total >= 100 AND NOT EXISTS (SELECT 1 FROM coin_transactions ct WHERE ct.order_id=o.id)
ON CONFLICT (order_id) DO NOTHING;

UPDATE coin_transactions ct
SET balance_after = balances.running_balance
FROM (
  SELECT id, SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at,id ROWS UNBOUNDED PRECEDING)::int AS running_balance
  FROM coin_transactions
) balances
WHERE ct.id=balances.id AND ct.balance_after=0;

UPDATE users u
SET coin_balance = COALESCE((SELECT SUM(amount)::int FROM coin_transactions ct WHERE ct.user_id=u.id),0)
WHERE u.coin_balance=0;

UPDATE orders o
SET coins_earned = ct.amount
FROM coin_transactions ct
WHERE ct.order_id=o.id AND ct.amount > 0 AND o.coins_earned=0;
