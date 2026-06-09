package com.cook2cart.productservice.controller;

import com.cook2cart.productservice.dto.IngredientProductSuggestionsDTO;
import com.cook2cart.productservice.dto.GenerateSuggestionsRequestDTO;
import com.cook2cart.productservice.service.ProductSuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductSuggestionController {

    private final ProductSuggestionService productSuggestionService;

    @PostMapping("/generate/{recipeId}")
    public List<IngredientProductSuggestionsDTO> generateSuggestions(@PathVariable Long recipeId) {
        return productSuggestionService.generateSuggestions(recipeId);
    }

    @PostMapping("/generate")
    public List<IngredientProductSuggestionsDTO> generateSuggestionsFromBody(
            @RequestBody GenerateSuggestionsRequestDTO request
    ) {
        return productSuggestionService.generateSuggestions(request.recipeId());
    }

    @GetMapping("/recipe/{recipeId}")
    public List<IngredientProductSuggestionsDTO> getSuggestionsByRecipe(@PathVariable Long recipeId) {
        return productSuggestionService.getSuggestionsByRecipe(recipeId);
    }
}
