-- V1: initial schema (docs/02-domain-model.md)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
    id              uuid PRIMARY KEY,
    email           varchar(320) NOT NULL,
    password_hash   varchar(255) NOT NULL,
    first_name      varchar(100),
    last_name       varchar(100),
    phone           varchar(30),
    role            varchar(20)  NOT NULL,
    email_verified  boolean      NOT NULL DEFAULT false,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_role CHECK (role IN ('USER', 'ADMIN'))
);

CREATE UNIQUE INDEX uk_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

CREATE TABLE refresh_tokens (
    id          uuid PRIMARY KEY,
    user_id     uuid         NOT NULL REFERENCES users (id),
    jti         varchar(36)  NOT NULL,
    expires_at  timestamptz  NOT NULL,
    revoked_at  timestamptz,
    created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uk_refresh_jti ON refresh_tokens (jti);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

CREATE TABLE categories (
    id          uuid PRIMARY KEY,
    parent_id   uuid REFERENCES categories (id),
    name        varchar(200) NOT NULL,
    slug        varchar(200) NOT NULL,
    description text,
    image_url   varchar(500),
    sort_order  integer      NOT NULL DEFAULT 0,
    is_active   boolean      NOT NULL DEFAULT true,
    deleted_at  timestamptz,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_categories_sort_order CHECK (sort_order >= 0)
);

CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE UNIQUE INDEX uk_categories_slug ON categories (slug) WHERE deleted_at IS NULL;

CREATE TABLE products (
    id                        uuid PRIMARY KEY,
    category_id               uuid          NOT NULL REFERENCES categories (id),
    name                      varchar(300)  NOT NULL,
    article                   varchar(64)   NOT NULL,
    description               text,
    series                    varchar(200),
    product_type              varchar(100),
    decor                     varchar(200),
    material                  varchar(100),
    capacity_ml               integer,
    weight_g                  integer,
    dimensions                varchar(100),
    country_of_origin         varchar(100),
    barcode                   varchar(32),
    price_cents               bigint        NOT NULL,
    discount_percent          integer,
    price_with_discount_cents bigint        NOT NULL,
    rating_average            numeric(2, 1) NOT NULL DEFAULT 0,
    rating_count              integer       NOT NULL DEFAULT 0,
    is_active                 boolean       NOT NULL DEFAULT true,
    deleted_at                timestamptz,
    created_at                timestamptz   NOT NULL DEFAULT now(),
    updated_at                timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT ck_products_price CHECK (price_cents >= 0 AND price_with_discount_cents >= 0),
    CONSTRAINT ck_products_discount CHECK (discount_percent IS NULL OR discount_percent BETWEEN 0 AND 100),
    CONSTRAINT ck_products_rating CHECK (rating_average >= 0 AND rating_count >= 0)
);

CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_series ON products (series);
CREATE UNIQUE INDEX uk_products_article ON products (article) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_price ON products (price_with_discount_cents);
CREATE INDEX idx_products_active ON products (is_active, deleted_at);

CREATE TABLE product_skus (
    id                        uuid PRIMARY KEY,
    product_id                uuid        NOT NULL REFERENCES products (id),
    name                      varchar(200) NOT NULL,
    article                   varchar(64) NOT NULL,
    price_cents               bigint,
    price_with_discount_cents bigint,
    stock_qty                 integer     NOT NULL DEFAULT 0,
    is_active                 boolean     NOT NULL DEFAULT true,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_skus_price CHECK ((price_cents IS NULL AND price_with_discount_cents IS NULL)
                                 OR (price_cents >= 0 AND price_with_discount_cents >= 0)),
    CONSTRAINT ck_skus_stock_qty CHECK (stock_qty >= 0)
);

CREATE INDEX idx_skus_product ON product_skus (product_id);
CREATE UNIQUE INDEX uk_skus_article ON product_skus (article);

CREATE TABLE product_images (
    id          uuid PRIMARY KEY,
    product_id  uuid         NOT NULL REFERENCES products (id),
    object_key  varchar(500) NOT NULL,
    url         varchar(500) NOT NULL,
    position    integer      NOT NULL DEFAULT 0,
    is_main     boolean      NOT NULL DEFAULT false,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_product_images_position CHECK (position >= 0)
);

CREATE INDEX idx_product_images_product_position ON product_images (product_id, position);

CREATE TABLE carts (
    id          uuid PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES users (id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uk_carts_user ON carts (user_id);

CREATE TABLE cart_items (
    id          uuid PRIMARY KEY,
    cart_id     uuid        NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
    sku_id      uuid        NOT NULL REFERENCES product_skus (id),
    quantity    integer     NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_cart_items_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);
CREATE UNIQUE INDEX uk_cart_items_sku ON cart_items (cart_id, sku_id);

CREATE TABLE orders (
    id                uuid PRIMARY KEY,
    number            varchar(20)  NOT NULL,
    user_id           uuid         NOT NULL REFERENCES users (id),
    status            varchar(20)  NOT NULL,
    items_total_cents bigint       NOT NULL,
    delivery_cents    bigint       NOT NULL DEFAULT 0,
    total_cents       bigint       NOT NULL,
    customer_name     varchar(200) NOT NULL,
    customer_phone    varchar(30)  NOT NULL,
    delivery_city     varchar(100),
    delivery_address  varchar(300),
    comment           text,
    status_history    jsonb        NOT NULL DEFAULT '[]'::jsonb,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_orders_status CHECK (status IN ('NEW', 'CONFIRMED', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT ck_orders_totals CHECK (items_total_cents >= 0 AND delivery_cents >= 0 AND total_cents >= 0)
);

CREATE UNIQUE INDEX uk_orders_number ON orders (number);
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders (status);

CREATE TABLE order_items (
    id                        uuid PRIMARY KEY,
    order_id                  uuid         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    sku_id                    uuid         REFERENCES product_skus (id),
    product_name              varchar(300) NOT NULL,
    sku_name                  varchar(200) NOT NULL,
    article                   varchar(64)  NOT NULL,
    price_cents               bigint       NOT NULL,
    price_with_discount_cents bigint       NOT NULL,
    quantity                  integer      NOT NULL,
    total_cents               bigint       NOT NULL,
    CONSTRAINT ck_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT ck_order_items_totals CHECK (total_cents >= 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_sku ON order_items (sku_id);

CREATE TABLE favorites (
    id          uuid PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES users (id),
    product_id  uuid        NOT NULL REFERENCES products (id),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uk_favorites_user_product ON favorites (user_id, product_id);
CREATE INDEX idx_favorites_user ON favorites (user_id);

CREATE TABLE reviews (
    id            uuid PRIMARY KEY,
    user_id       uuid        NOT NULL REFERENCES users (id),
    product_id    uuid        NOT NULL REFERENCES products (id),
    rating        smallint    NOT NULL,
    text          text,
    purchased_at  timestamptz,
    is_moderated  boolean     NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX uk_reviews_user_product ON reviews (user_id, product_id);
CREATE INDEX idx_reviews_product_created ON reviews (product_id, created_at DESC);

CREATE TABLE processed_events (
    id           uuid PRIMARY KEY,
    event_id     uuid         NOT NULL,
    consumer     varchar(100) NOT NULL,
    processed_at timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uk_processed_events_consumer_event ON processed_events (consumer, event_id);
