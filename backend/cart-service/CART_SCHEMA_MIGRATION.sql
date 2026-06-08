-- Run this on cook2cart_cart_db after deploying cart-service.

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    ingredient_id BIGINT,
    product_name VARCHAR(255),
    brand VARCHAR(255),
    size VARCHAR(255),
    price NUMERIC(38, 2),
    image_url VARCHAR(255),
    source VARCHAR(255),
    availability VARCHAR(255),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_ingredient_id
    ON products(ingredient_id);

ALTER TABLE carts
    ADD COLUMN IF NOT EXISTS total_price NUMERIC(38, 2),
    ADD COLUMN IF NOT EXISTS original_servings INTEGER,
    ADD COLUMN IF NOT EXISTS target_servings INTEGER,
    ADD COLUMN IF NOT EXISTS status VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

ALTER TABLE cart_items
    ADD COLUMN IF NOT EXISTS ingredient_id BIGINT,
    ADD COLUMN IF NOT EXISTS selected_product_id BIGINT,
    ADD COLUMN IF NOT EXISTS recipe_id BIGINT,
    ADD COLUMN IF NOT EXISTS recipe_quantity DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS recipe_unit VARCHAR(255),
    ADD COLUMN IF NOT EXISTS quantity DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS unit VARCHAR(255),
    ADD COLUMN IF NOT EXISTS price NUMERIC(38, 2),
    ADD COLUMN IF NOT EXISTS available_at_home BOOLEAN,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

UPDATE cart_items
SET price = COALESCE(price, estimated_price, 0),
    recipe_quantity = COALESCE(recipe_quantity, quantity),
    recipe_unit = COALESCE(recipe_unit, unit),
    available_at_home = COALESCE(available_at_home, false),
    created_at = COALESCE(created_at, now());

UPDATE carts
SET original_servings = COALESCE(original_servings, 4),
    target_servings = COALESCE(target_servings, original_servings, 4),
    status = COALESCE(status, 'ACTIVE'),
    total_price = COALESCE(total_price, 0),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, created_at, now());

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_cart_items_selected_product'
    ) THEN
        ALTER TABLE cart_items
            ADD CONSTRAINT fk_cart_items_selected_product
            FOREIGN KEY (selected_product_id)
            REFERENCES products(id);
    END IF;
END $$;
