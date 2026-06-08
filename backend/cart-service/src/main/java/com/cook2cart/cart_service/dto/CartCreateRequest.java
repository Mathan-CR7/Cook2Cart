package com.cook2cart.cart_service.dto;

import java.util.List;

public record CartCreateRequest(
        Long userId,
        Integer originalServings,
        Integer targetServings,
        List<CartItemRequest> items
) {
}
