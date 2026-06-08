package com.cook2cart.cart_service.controller;

import com.cook2cart.cart_service.dto.CartCreateRequest;
import com.cook2cart.cart_service.dto.CartDTO;
import com.cook2cart.cart_service.dto.ProductDTO;
import com.cook2cart.cart_service.dto.ProductRequest;
import com.cook2cart.cart_service.entity.CartStatus;
import com.cook2cart.cart_service.service.CartCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/carts")
@RequiredArgsConstructor
public class CartCatalogController {

    private final CartCatalogService cartCatalogService;

    @PostMapping
    public CartDTO createCart(@RequestBody CartCreateRequest request) {
        return cartCatalogService.createCart(request);
    }

    @GetMapping("/{cartId}")
    public CartDTO getCart(@PathVariable Long cartId) {
        return cartCatalogService.getCart(cartId);
    }

    @GetMapping("/user/{userId}")
    public List<CartDTO> getCartsByUser(@PathVariable Long userId) {
        return cartCatalogService.getCartsByUser(userId);
    }

    @PatchMapping("/{cartId}/status")
    public CartDTO updateStatus(@PathVariable Long cartId, @RequestParam CartStatus status) {
        return cartCatalogService.updateStatus(cartId, status);
    }

    @PostMapping("/products")
    public ProductDTO saveProduct(@RequestBody ProductRequest request) {
        return cartCatalogService.saveProduct(request);
    }

    @GetMapping("/products")
    public List<ProductDTO> getProducts(@RequestParam Long ingredientId) {
        return cartCatalogService.getProductsByIngredient(ingredientId);
    }
}
