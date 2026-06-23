package com.cook2cart.ai_service.service;

import com.cook2cart.ai_service.dto.*;
import com.cook2cart.ai_service.entity.*;
import com.cook2cart.ai_service.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeCatalogServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @InjectMocks
    private RecipeCatalogService recipeCatalogService;

    private Recipe recipe;
    private IngredientEntity ingredientEntity;
    private RecipeIngredient recipeIngredient;
    private RecipeInstruction recipeInstruction;

    @BeforeEach
    void setUp() {
        ingredientEntity = IngredientEntity.builder()
                .id(101L)
                .name("onion")
                .build();

        recipe = Recipe.builder()
                .id(1L)
                .userId(10L)
                .videoId(20L)
                .recipeName("Pasta")
                .cuisine("Italian")
                .thumbnailUrl("thumb")
                .build();

        recipeIngredient = RecipeIngredient.builder()
                .id(50L)
                .recipe(recipe)
                .ingredient(ingredientEntity)
                .recipeQuantity(2.0)
                .recipeUnit("pcs")
                .quantity(100.0)
                .unit("g")
                .estimated(false)
                .source("speech")
                .confidence(0.95)
                .build();

        recipeInstruction = RecipeInstruction.builder()
                .id(60L)
                .recipe(recipe)
                .stepNumber(1)
                .instruction("Boil the pasta")
                .build();

        recipe.getIngredients().add(recipeIngredient);
        recipe.getInstructions().add(recipeInstruction);
    }

    @Test
    void createRecipe_Success() {
        RecipeIngredientRequest ingReq = new RecipeIngredientRequest("onion", 2.0, "pcs", 100.0, "g", false, "speech", 0.95);
        RecipeCreateRequest request = new RecipeCreateRequest(
                10L, 20L, "youtube123", "Pasta", "Italian", "thumb",
                Collections.singletonList(ingReq),
                Collections.singletonList("Boil the pasta")
        );

        when(ingredientRepository.findByNameIgnoreCase("onion")).thenReturn(Optional.of(ingredientEntity));
        when(recipeRepository.save(any(Recipe.class))).thenReturn(recipe);

        RecipeDTO response = recipeCatalogService.createRecipe(request);

        assertNotNull(response);
        assertEquals(1L, response.id());
        assertEquals("Pasta", response.recipeName());
        assertEquals(1, response.ingredients().size());
        assertEquals("onion", response.ingredients().get(0).ingredientName());
        assertEquals(1, response.instructions().size());
        assertEquals("Boil the pasta", response.instructions().get(0).instruction());
        verify(recipeRepository, times(1)).save(any(Recipe.class));
    }

    @Test
    void getRecipesByUser_Success() {
        when(recipeRepository.findByUserId(10L)).thenReturn(Arrays.asList(recipe));

        List<RecipeDTO> results = recipeCatalogService.getRecipesByUser(10L);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(1L, results.get(0).id());
        verify(recipeRepository, times(1)).findByUserId(10L);
    }

    @Test
    void getLatestRecipeByVideoId_Success() {
        when(recipeRepository.findLatestIdByVideoId(20L)).thenReturn(Optional.of(1L));
        when(recipeRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(recipe));

        RecipeDTO result = recipeCatalogService.getLatestRecipeByVideoId(20L);

        assertNotNull(result);
        assertEquals(1L, result.id());
        verify(recipeRepository, times(1)).findLatestIdByVideoId(20L);
        verify(recipeRepository, times(1)).findByIdWithDetails(1L);
    }

    @Test
    void getLatestRecipeByVideoId_NotFound() {
        when(recipeRepository.findLatestIdByVideoId(20L)).thenReturn(Optional.empty());

        RecipeDTO result = recipeCatalogService.getLatestRecipeByVideoId(20L);

        assertNull(result);
        verify(recipeRepository, times(1)).findLatestIdByVideoId(20L);
    }

    @Test
    void getRecipeIngredients_Success() {
        when(recipeRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(recipe));

        List<RecipeIngredientDTO> results = recipeCatalogService.getRecipeIngredients(1L);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(50L, results.get(0).id());
        assertEquals("onion", results.get(0).ingredientName());
        verify(recipeRepository, times(1)).findByIdWithDetails(1L);
    }
}
