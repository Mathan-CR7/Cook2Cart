package com.cook2cart.cart_service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductDTO(
        Long id,
        Long ingredientId,
        String productName,
        String brand,
        String size,
        BigDecimal price,
        String imageUrl,
        String source,
        String availability,
        LocalDateTime updatedAt
) {
}
