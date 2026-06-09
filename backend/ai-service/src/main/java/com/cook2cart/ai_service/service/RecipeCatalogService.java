package com.cook2cart.ai_service.service;

import com.cook2cart.ai_service.dto.*;
import com.cook2cart.ai_service.entity.*;
import com.cook2cart.ai_service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class RecipeCatalogService {

    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;

    @Transactional
    public RecipeDTO createRecipe(RecipeCreateRequest request) {
        Recipe recipe = Recipe.builder()
                .userId(request.userId())
                .videoId(request.videoId())
                .recipeName(request.recipeName())
                .cuisine(request.cuisine())
                .thumbnailUrl(request.thumbnailUrl())
                .createdAt(LocalDateTime.now())
                .build();

        if (request.ingredients() != null) {
            request.ingredients().stream()
                    .filter(item -> item.ingredientName() != null && !item.ingredientName().isBlank())
                    .forEach(item -> {
                        IngredientEntity ingredient = getOrCreateIngredient(item.ingredientName());

                        recipe.getIngredients().add(RecipeIngredient.builder()
                                .recipe(recipe)
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

                recipe.getInstructions().add(RecipeInstruction.builder()
                        .recipe(recipe)
                        .stepNumber(i + 1)
                        .instruction(instruction.trim())
                        .build());
            }
        }

        return toRecipeDTO(recipeRepository.save(recipe));
    }

    @Transactional(readOnly = true)
    public List<RecipeDTO> getRecipesByUser(Long userId) {
        return recipeRepository.findByUserId(userId).stream().map(this::toRecipeDTO).toList();
    }

    @Transactional(readOnly = true)
    public RecipeDTO getLatestRecipeByVideoId(Long videoId) {
        Recipe recipe = recipeRepository.findFirstByVideoIdOrderByCreatedAtDesc(videoId)
                .orElseThrow(() -> new RuntimeException("Recipe not found for video"));

        return toRecipeDTO(recipe);
    }

    @Transactional(readOnly = true)
    public List<RecipeIngredientDTO> getRecipeIngredients(Long recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
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

        return new RecipeDTO(recipe.getId(), recipe.getUserId(), recipe.getVideoId(), recipe.getRecipeName(),
                recipe.getCuisine(), recipe.getThumbnailUrl(), recipe.getCreatedAt(), ingredients, instructions);
    }
}
