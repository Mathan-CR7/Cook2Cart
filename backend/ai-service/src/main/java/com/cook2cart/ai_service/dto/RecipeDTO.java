package com.cook2cart.ai_service.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RecipeDTO(
        Long id,
        Long userId,
        Long videoId,
        String youtubeVideoId,
        String recipeName,
        String cuisine,
        String thumbnailUrl,
        LocalDateTime createdAt,
        List<RecipeIngredientDTO> ingredients,
        List<RecipeInstructionDTO> instructions
) {
}
