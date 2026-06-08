package com.cook2cart.ai_service.dto;

public record RecipeIngredientRequest(
        String ingredientName,
        Double recipeQuantity,
        String recipeUnit,
        Double quantity,
        String unit,
        Boolean estimated,
        String source,
        Double confidence
) {
}
