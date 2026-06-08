package com.cook2cart.ai_service.dto;

import java.util.List;

public record RecipeCreateRequest(
        Long userId,
        Long videoId,
        String recipeName,
        String cuisine,
        String thumbnailUrl,
        List<RecipeIngredientRequest> ingredients,
        List<String> instructions
) {
}
