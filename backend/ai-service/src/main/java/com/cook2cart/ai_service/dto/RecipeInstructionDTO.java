package com.cook2cart.ai_service.dto;

public record RecipeInstructionDTO(
        Long id,
        Integer stepNumber,
        String instruction
) {
}
