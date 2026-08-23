-- V3: order number sequence + request id for idempotent checkout

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

ALTER TABLE orders ADD COLUMN request_id varchar(64);

CREATE UNIQUE INDEX uk_orders_request_id ON orders (request_id);
