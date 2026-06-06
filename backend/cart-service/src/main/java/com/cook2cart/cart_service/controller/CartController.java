package com.cook2cart.cart_service.controller;

import com.cook2cart.cart_service.dto.Cart;
import com.cook2cart.cart_service.dto.Ingredient;
import com.cook2cart.cart_service.repository.CartRepository;
import com.cook2cart.cart_service.service.CartService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;
    private final CartRepository cartRepository;

    public CartController(CartService cartService, CartRepository cartRepository) {
        this.cartService = cartService;
        this.cartRepository = cartRepository;
    }

    @PostMapping("/initialize")
    public ResponseEntity<Cart> initializeCart(@RequestBody List<Ingredient> ingredients,
                                               @RequestParam(value = "servings", defaultValue = "4") int servings) {
        Cart cart = cartService.initializeCart(ingredients, servings);
        if (cart != null) {
            cart = cartRepository.save(cart);
        }
        return ResponseEntity.ok(cart);
    }

    @PostMapping("/scale")
    public ResponseEntity<Cart> scaleCart(@RequestBody Cart cart,
                                          @RequestParam("targetServings") int targetServings) {
        Cart scaledCart = cartService.scaleCart(cart, targetServings);
        if (scaledCart != null) {
            scaledCart = cartRepository.save(scaledCart);
        }
        return ResponseEntity.ok(scaledCart);
    }

    @PutMapping("/items/{index}")
    public ResponseEntity<Cart> updateCartItem(@RequestBody Cart cart,
                                               @PathVariable("index") int index,
                                               @RequestParam(value = "productId", required = false) String productId,
                                               @RequestParam(value = "brand", required = false) String brand,
                                               @RequestParam(value = "size", required = false) String size,
                                               @RequestParam(value = "availableAtHome", required = false) Boolean availableAtHome) {
        Cart updatedCart = cartService.updateCartItem(cart, index, productId, brand, size, availableAtHome);
        if (updatedCart != null) {
            updatedCart = cartRepository.save(updatedCart);
        }
        return ResponseEntity.ok(updatedCart);
    }

    @PostMapping("/prices")
    public ResponseEntity<Cart> updateLatestPrices(@RequestBody Cart cart) {
        Cart updatedCart = cartService.updateLatestPrices(cart);
        if (updatedCart != null) {
            updatedCart = cartRepository.save(updatedCart);
        }
        return ResponseEntity.ok(updatedCart);
    }

    @DeleteMapping("/items/{index}")
    public ResponseEntity<Cart> removeCartItem(@RequestBody Cart cart,
                                               @PathVariable("index") int index) {
        Cart updatedCart = cartService.removeCartItem(cart, index);
        if (updatedCart != null) {
            updatedCart = cartRepository.save(updatedCart);
        }
        return ResponseEntity.ok(updatedCart);
    }
}
