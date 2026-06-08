package com.cook2cart.cart_service.dto;

import java.math.BigDecimal;

public record CartItemDTO(
        Long id,
        Long ingredientId,
        Long selectedProductId,
        Long recipeId,
        String ingredientName,
        Double recipeQuantity,
        String recipeUnit,
        Double quantity,
        String unit,
        BigDecimal price,
        BigDecimal estimatedPrice,
        Boolean availableAtHome,
        ProductDTO selectedProduct
) {
}
