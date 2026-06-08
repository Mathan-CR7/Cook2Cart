package com.cook2cart.cart_service.dto;

import java.math.BigDecimal;

public record ProductRequest(
        Long ingredientId,
        String productName,
        String brand,
        String size,
        BigDecimal price,
        String imageUrl,
        String source,
        String availability
) {
}
