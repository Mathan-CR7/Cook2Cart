package com.cook2cart.productservice.dto;

public record RecipeIngredientDTO(
        Long id,
        Long ingredientId,
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
