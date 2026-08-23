-- V2: discount_percent for SKUs (docs/03-api-design.md: SKU has own optional discount)

ALTER TABLE product_skus ADD COLUMN discount_percent integer;

ALTER TABLE product_skus ADD CONSTRAINT ck_skus_discount
    CHECK (discount_percent IS NULL OR discount_percent BETWEEN 0 AND 100);
