-- Run this once on cook2cart_ai_db after deploying the IngredientEntity change.
-- It moves existing recipe_ingredients.ingredient_name values into the master ingredients table
-- and fills recipe_ingredients.ingredient_id for old rows.

CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

ALTER TABLE recipe_ingredients
    ADD COLUMN IF NOT EXISTS ingredient_id BIGINT;

INSERT INTO ingredients (name)
SELECT DISTINCT lower(trim(regexp_replace(ingredient_name, '\s+', ' ', 'g'))) AS name
FROM recipe_ingredients
WHERE ingredient_name IS NOT NULL
  AND trim(ingredient_name) <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE recipe_ingredients ri
SET ingredient_id = i.id
FROM ingredients i
WHERE ri.ingredient_id IS NULL
  AND i.name = lower(trim(regexp_replace(ri.ingredient_name, '\s+', ' ', 'g')));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_recipe_ingredients_ingredient'
    ) THEN
        ALTER TABLE recipe_ingredients
            ADD CONSTRAINT fk_recipe_ingredients_ingredient
            FOREIGN KEY (ingredient_id)
            REFERENCES ingredients(id);
    END IF;
END $$;

-- After you verify old rows are migrated, you can remove the duplicate text column:
-- ALTER TABLE recipe_ingredients DROP COLUMN ingredient_name;
