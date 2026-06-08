package com.cook2cart.ai_service.service;

import com.cook2cart.ai_service.dto.RecipeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecipeCacheService {

    private static final Duration RECIPE_CACHE_TTL = Duration.ofHours(24);

    private final RedisTemplate<String, Object> redisTemplate;

    public Optional<RecipeResponse> getRecipe(String videoId) {
        if (videoId == null || videoId.isBlank()) {
            return Optional.empty();
        }

        String key = buildKey(videoId);
        Object cachedValue = redisTemplate.opsForValue().get(key);

        if (cachedValue instanceof RecipeResponse recipeResponse) {
            log.info("CACHE HIT - Returning recipe from Redis for key: {}", key);
            return Optional.of(recipeResponse);
        }

        log.info("CACHE MISS - Processing video for key: {}", key);
        return Optional.empty();
    }

    public void cacheRecipe(String videoId, RecipeResponse response) {
        if (videoId == null || videoId.isBlank() || response == null) {
            return;
        }

        String key = buildKey(videoId);
        redisTemplate.opsForValue().set(key, response, RECIPE_CACHE_TTL);
        log.info("Recipe saved in Redis with key: {} ttlSeconds: {}", key, RECIPE_CACHE_TTL.toSeconds());
    }

    public String buildKey(String videoId) {
        return "recipe:video:" + videoId.trim();
    }
}
