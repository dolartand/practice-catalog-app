BEGIN;

-- Реальные категории каталога ДФЗ (slug'и из seed_catalog.sql)
DO $$
DECLARE
  real_slugs text[] := ARRAY[
    'blyudo','blyudtsa','kruzhki','drugie-izdeliya','pribory-dlya-spetsiy',
    'chaynye-i-kofeynye-pary','chayniki-kuvshiny','lotki','maslenki','miski',
    'nabory','pialy','salatniki','sakharnitsy','seledochnitsy',
    'servizy-kofeynye','servizy-stolovye','servizy-chaynye','stakany','suveniry',
    'tarelki','chashki','chashki-bulionnye','etazherki'
  ];
BEGIN
  -- 1) Убрать ссылки бизнес-данных на тестовые SKU/товары
  DELETE FROM cart_items
   WHERE sku_id IN (
     SELECT s.id FROM product_skus s
      JOIN products p ON p.id = s.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE NOT (c.slug = ANY(real_slugs)) AND c.deleted_at IS NULL
   );

  DELETE FROM favorites
   WHERE product_id IN (
     SELECT p.id FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE NOT (c.slug = ANY(real_slugs)) AND c.deleted_at IS NULL
   );

  DELETE FROM reviews
   WHERE product_id IN (
     SELECT p.id FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE NOT (c.slug = ANY(real_slugs)) AND c.deleted_at IS NULL
   );

  -- снимок в заказе сохраняем, но FK на SKU обнуляем (schema: sku_id nullable)
  UPDATE order_items SET sku_id = NULL
   WHERE sku_id IN (
     SELECT s.id FROM product_skus s
      JOIN products p ON p.id = s.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE NOT (c.slug = ANY(real_slugs)) AND c.deleted_at IS NULL
   );

  -- 2) Удалить сам тестовый каталог
  DELETE FROM product_images
   WHERE product_id IN (
     SELECT p.id FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE NOT (c.slug = ANY(real_slugs)) AND c.deleted_at IS NULL
   );

  DELETE FROM product_skus
   WHERE product_id IN (
     SELECT p.id FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE NOT (c.slug = ANY(real_slugs)) AND c.deleted_at IS NULL
   );

  DELETE FROM products
   WHERE category_id IN (
     SELECT c.id FROM categories c
      WHERE NOT (c.slug = ANY(real_slugs)) AND c.deleted_at IS NULL
   );

  DELETE FROM categories
   WHERE NOT (slug = ANY(real_slugs)) AND deleted_at IS NULL;
END $$;

COMMIT;