-- Run this on cook2cart_ai_db after deploying the recipe ingredient detail change.
-- The ingredient name remains only in ingredients.name.
-- recipe_ingredients stores the relationship and per-recipe measurement details.

ALTER TABLE recipe_ingredients
    ADD COLUMN IF NOT EXISTS recipe_quantity DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS recipe_unit VARCHAR(255),
    ADD COLUMN IF NOT EXISTS estimated BOOLEAN,
    ADD COLUMN IF NOT EXISTS source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;

-- Backfill old rows where only quantity/unit existed.
UPDATE recipe_ingredients
SET recipe_quantity = COALESCE(recipe_quantity, quantity),
    recipe_unit = COALESCE(recipe_unit, unit),
    estimated = COALESCE(estimated, false),
    source = COALESCE(source, 'legacy'),
    confidence = COALESCE(confidence, 0.0);

-- After verifying ingredient_id is populated for all rows, keep ingredient_name removed/unused.
-- ALTER TABLE recipe_ingredients DROP COLUMN IF EXISTS ingredient_name;
