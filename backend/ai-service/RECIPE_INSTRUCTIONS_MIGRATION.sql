-- Run this on cook2cart_ai_db to create normalized recipe instructions.
-- Instructions are stored one row per step, not as JSON.

CREATE TABLE IF NOT EXISTS recipe_instructions (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT NOT NULL,
    step_number INTEGER,
    instruction TEXT,
    CONSTRAINT fk_recipe_instructions_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id
    ON recipe_instructions(recipe_id);
