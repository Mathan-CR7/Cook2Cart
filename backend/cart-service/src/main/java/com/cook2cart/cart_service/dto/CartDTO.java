package com.cook2cart.cart_service.dto;

import com.cook2cart.cart_service.entity.CartStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CartDTO(
        Long id,
        Long userId,
        CartStatus status,
        BigDecimal totalPrice,
        Integer originalServings,
        Integer targetServings,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<CartItemDTO> items
) {
}
