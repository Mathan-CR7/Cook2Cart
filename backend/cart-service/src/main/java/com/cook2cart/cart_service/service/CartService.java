package com.cook2cart.cart_service.service;

import com.cook2cart.cart_service.dto.Cart;
import com.cook2cart.cart_service.dto.Ingredient;
import java.util.List;

public interface CartService {
    Cart initializeCart(List<Ingredient> ingredients, int servings);
    Cart scaleCart(Cart cart, int targetServings);
    Cart updateCartItem(Cart cart, int index, String productId, String brand, String size, Boolean availableAtHome);
    Cart updateLatestPrices(Cart cart);
    Cart removeCartItem(Cart cart, int index);
}
