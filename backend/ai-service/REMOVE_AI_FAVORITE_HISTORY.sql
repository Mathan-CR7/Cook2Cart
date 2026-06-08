-- Run this on cook2cart_ai_db after deploying the ai-service code change.
-- Favorites, saved items, and history are owned by video-service.user_video_actions.

DROP TABLE IF EXISTS recipe_favorites CASCADE;
DROP TABLE IF EXISTS recipe_search_history CASCADE;
