package com.cook2cart.productservice.dto;

import java.util.List;

public record IngredientProductSuggestionsDTO(
        Long recipeIngredientId,
        String ingredientName,
        List<ProductSuggestionDTO> suggestions
) {
}
