package com.cook2cart.ai_service.service;

import com.cook2cart.ai_service.dto.*;
import com.cook2cart.ai_service.entity.*;
import com.cook2cart.ai_service.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecipeCatalogService {

    private static final Duration USER_RECIPES_CACHE_TTL = Duration.ofHours(6);
    private static final String USER_RECIPES_CACHE_PREFIX = "recipes:user:";

    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Transactional
    public RecipeDTO createRecipe(RecipeCreateRequest request) {
        // If we already have a recipe for this YouTube video, update it instead of duplicating
        Recipe recipe = null;
        if (request.youtubeVideoId() != null && !request.youtubeVideoId().isBlank()) {
            recipe = recipeRepository.findLatestIdByYoutubeVideoId(request.youtubeVideoId())
                    .flatMap(recipeRepository::findByIdWithDetails)
                    .orElse(null);
        }
        if (recipe == null && request.videoId() != null) {
            recipe = recipeRepository.findLatestIdByVideoId(request.videoId())
                    .flatMap(recipeRepository::findByIdWithDetails)
                    .orElse(null);
        }
        if (recipe == null) {
            recipe = Recipe.builder()
                    .userId(request.userId())
                    .videoId(request.videoId())
                    .youtubeVideoId(request.youtubeVideoId())
                    .recipeName(request.recipeName())
                    .cuisine(request.cuisine())
                    .thumbnailUrl(request.thumbnailUrl())
                    .createdAt(LocalDateTime.now())
                    .build();
        } else {
            // Update fields but keep existing ingredients/instructions if new ones provided
            recipe.setUserId(request.userId());
            if (request.videoId() != null) recipe.setVideoId(request.videoId());
            if (request.youtubeVideoId() != null) recipe.setYoutubeVideoId(request.youtubeVideoId());
            recipe.setRecipeName(request.recipeName());
            recipe.setCuisine(request.cuisine());
            recipe.setThumbnailUrl(request.thumbnailUrl());
            recipe.setCreatedAt(LocalDateTime.now());
            // Clear old ingredients and instructions to replace with new ones
            recipe.getIngredients().clear();
            recipe.getInstructions().clear();
        }

        final Recipe finalRecipe = recipe;
        if (request.ingredients() != null) {
            request.ingredients().stream()
                    .filter(item -> item.ingredientName() != null && !item.ingredientName().isBlank())
                    .forEach(item -> {
                        IngredientEntity ingredient = getOrCreateIngredient(item.ingredientName());

                        finalRecipe.getIngredients().add(RecipeIngredient.builder()
                                .recipe(finalRecipe)
                                .ingredient(ingredient)
                                .recipeQuantity(item.recipeQuantity())
                                .recipeUnit(item.recipeUnit())
                                .quantity(item.quantity())
                                .unit(item.unit())
                                .estimated(Boolean.TRUE.equals(item.estimated()))
                                .source(item.source())
                                .confidence(item.confidence())
                                .build());
                    });
        }

        if (request.instructions() != null) {
            for (int i = 0; i < request.instructions().size(); i++) {
                String instruction = request.instructions().get(i);
                if (instruction == null || instruction.isBlank()) {
                    continue;
                }

                finalRecipe.getInstructions().add(RecipeInstruction.builder()
                        .recipe(finalRecipe)
                        .stepNumber(i + 1)
                        .instruction(instruction.trim())
                        .build());
            }
        }

        RecipeDTO savedRecipe = toRecipeDTO(recipeRepository.save(finalRecipe));
        evictUserRecipesCache(request.userId());
        return savedRecipe;
    }

    @Transactional(readOnly = true)
    public List<RecipeDTO> getRecipesByUser(Long userId) {
        String cacheKey = buildUserRecipesCacheKey(userId);
        List<RecipeDTO> cachedRecipes = readUserRecipesFromCache(cacheKey, userId);

        if (cachedRecipes != null) {
            return cachedRecipes;
        }

        log.info("CACHE MISS - Loading processed recipes from database for userId: {}", userId);

        List<RecipeDTO> recipes = deduplicateRecipes(
                recipeRepository.findByUserId(userId).stream()
                        .sorted(Comparator.comparing(Recipe::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                        .map(this::toRecipeDTO)
                        .toList()
        );

        cacheUserRecipes(cacheKey, userId, recipes);
        return recipes;
    }

    @Transactional(readOnly = true)
    public RecipeDTO getLatestRecipeByVideoId(Long videoId) {
        if (videoId == null) return null;
        // Two-step: find ID first (SQL LIMIT works correctly), then fetch full entity with JOIN FETCH
        return recipeRepository.findLatestIdByVideoId(videoId)
                .flatMap(recipeRepository::findByIdWithDetails)
                .map(this::toRecipeDTO)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public RecipeDTO getLatestRecipeByYoutubeVideoId(String youtubeVideoId) {
        if (youtubeVideoId == null || youtubeVideoId.isBlank()) return null;
        // Two-step: find ID first (SQL LIMIT works correctly), then fetch full entity with JOIN FETCH
        return recipeRepository.findLatestIdByYoutubeVideoId(youtubeVideoId)
                .flatMap(recipeRepository::findByIdWithDetails)
                .map(this::toRecipeDTO)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean recipeExistsForVideo(Long videoId) {
        if (videoId == null) {
            return false;
        }
        return recipeRepository.findLatestIdByVideoId(videoId).isPresent();
    }

    @Transactional(readOnly = true)
    public List<RecipeIngredientDTO> getRecipeIngredients(Long recipeId) {
        Recipe recipe = recipeRepository.findByIdWithDetails(recipeId)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));

        return recipe.getIngredients().stream()
                .map(item -> new RecipeIngredientDTO(
                        item.getId(),
                        item.getIngredient() != null ? item.getIngredient().getId() : null,
                        item.getIngredient() != null ? item.getIngredient().getName() : null,
                        item.getRecipeQuantity(),
                        item.getRecipeUnit(),
                        item.getQuantity(),
                        item.getUnit(),
                        item.getEstimated(),
                        item.getSource(),
                        item.getConfidence()
                ))
                .toList();
    }

    private IngredientEntity getOrCreateIngredient(String rawName) {
        String name = normalizeIngredientName(rawName);

        return ingredientRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> ingredientRepository.save(IngredientEntity.builder()
                        .name(name)
                        .build()));
    }

    private String normalizeIngredientName(String rawName) {
        return rawName.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    private List<RecipeDTO> deduplicateRecipes(List<RecipeDTO> recipes) {
        Map<String, RecipeDTO> uniqueRecipes = new LinkedHashMap<>();

        for (RecipeDTO recipe : recipes) {
            String key = recipe.videoId() != null
                    ? "video:" + recipe.videoId()
                    : "name:" + normalizeRecipeName(recipe.recipeName());

            uniqueRecipes.putIfAbsent(key, recipe);
        }

        return uniqueRecipes.values().stream().toList();
    }

    private String normalizeRecipeName(String name) {
        if (name == null || name.isBlank()) {
            return "recipe";
        }

        return name.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    private String buildUserRecipesCacheKey(Long userId) {
        return USER_RECIPES_CACHE_PREFIX + userId;
    }

    private void evictUserRecipesCache(Long userId) {
        if (userId == null) {
            return;
        }

        try {
            redisTemplate.delete(buildUserRecipesCacheKey(userId));
            log.info("Evicted processed recipes Redis cache for userId: {}", userId);
        } catch (RuntimeException ex) {
            log.warn("Redis cache eviction skipped for userId {}: {}", userId, ex.getMessage());
        }
    }

    private List<RecipeDTO> readUserRecipesFromCache(String cacheKey, Long userId) {
        try {
            Object cachedRecipes = redisTemplate.opsForValue().get(cacheKey);

            if (cachedRecipes instanceof List<?> cachedList && cachedList.stream().allMatch(RecipeDTO.class::isInstance)) {
                log.info("CACHE HIT - Returning processed recipes from Redis for userId: {}", userId);
                return cachedList.stream()
                        .map(RecipeDTO.class::cast)
                        .toList();
            }
        } catch (RuntimeException ex) {
            log.warn("Redis cache read skipped for userId {}: {}", userId, ex.getMessage());
        }

        return null;
    }

    private void cacheUserRecipes(String cacheKey, Long userId, List<RecipeDTO> recipes) {
        try {
            redisTemplate.opsForValue().set(cacheKey, recipes, USER_RECIPES_CACHE_TTL);
        } catch (RuntimeException ex) {
            log.warn("Redis cache write skipped for userId {}: {}", userId, ex.getMessage());
        }
    }

    private RecipeDTO toRecipeDTO(Recipe recipe) {
        List<RecipeIngredientDTO> ingredients = recipe.getIngredients().stream()
                .map(item -> new RecipeIngredientDTO(
                        item.getId(),
                        item.getIngredient() != null ? item.getIngredient().getId() : null,
                        item.getIngredient() != null ? item.getIngredient().getName() : null,
                        item.getRecipeQuantity(),
                        item.getRecipeUnit(),
                        item.getQuantity(),
                        item.getUnit(),
                        item.getEstimated(),
                        item.getSource(),
                        item.getConfidence()
                ))
                .toList();

        List<RecipeInstructionDTO> instructions = recipe.getInstructions().stream()
                .map(item -> new RecipeInstructionDTO(item.getId(), item.getStepNumber(), item.getInstruction()))
                .toList();

        return new RecipeDTO(recipe.getId(), recipe.getUserId(), recipe.getVideoId(), recipe.getYoutubeVideoId(),
                recipe.getRecipeName(), recipe.getCuisine(), recipe.getThumbnailUrl(), recipe.getCreatedAt(),
                ingredients, instructions);
    }
}
