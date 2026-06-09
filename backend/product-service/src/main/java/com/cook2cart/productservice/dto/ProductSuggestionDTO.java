package com.cook2cart.productservice.dto;

import com.cook2cart.productservice.enums.ProductSource;

import java.math.BigDecimal;

public record ProductSuggestionDTO(
        Long id,
        Long recipeId,
        Long recipeIngredientId,
        String ingredientName,
        String productName,
        String brandName,
        String imageUrl,
        String barcode,
        String packQuantity,
        BigDecimal marketPrice,
        String priceUnit,
        String marketName,
        ProductSource source
) {
}
