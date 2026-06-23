package com.cook2cart.ai_service.controller;

import com.cook2cart.ai_service.dto.*;
import com.cook2cart.ai_service.service.RecipeCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recipes")
@RequiredArgsConstructor
public class RecipeCatalogController {

    private final RecipeCatalogService recipeCatalogService;

    @PostMapping
    public RecipeDTO createRecipe(@RequestBody RecipeCreateRequest request) {
        return recipeCatalogService.createRecipe(request);
    }

    @GetMapping("/user/{userId}")
    public List<RecipeDTO> getRecipesByUser(@PathVariable Long userId) {
        return recipeCatalogService.getRecipesByUser(userId);
    }

    @GetMapping("/video/{videoId}")
    public RecipeDTO getLatestRecipeByVideo(@PathVariable Long videoId) {
        return recipeCatalogService.getLatestRecipeByVideoId(videoId);
    }

    @GetMapping("/check/{youtubeVideoId}")
    public org.springframework.http.ResponseEntity<RecipeDTO> checkRecipeByYoutubeId(@PathVariable String youtubeVideoId) {
        try {
            RecipeDTO recipe = recipeCatalogService.getLatestRecipeByYoutubeVideoId(youtubeVideoId);
            if (recipe != null) {
                return org.springframework.http.ResponseEntity.ok(recipe);
            }
        } catch (Exception ignored) {
        }
        return org.springframework.http.ResponseEntity.noContent().build();
    }

    @GetMapping("/{recipeId}/ingredients")
    public List<RecipeIngredientDTO> getRecipeIngredients(@PathVariable Long recipeId) {
        return recipeCatalogService.getRecipeIngredients(recipeId);
    }
}
