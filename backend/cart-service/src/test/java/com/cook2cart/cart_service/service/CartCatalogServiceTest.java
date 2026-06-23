package com.cook2cart.cart_service.service;

import com.cook2cart.cart_service.dto.*;
import com.cook2cart.cart_service.entity.*;
import com.cook2cart.cart_service.repository.CartEntityRepository;
import com.cook2cart.cart_service.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartCatalogServiceTest {

    @Mock
    private CartEntityRepository cartRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CartCatalogService cartCatalogService;

    private CartEntity cartEntity;
    private CartItemEntity cartItemEntity;
    private ProductEntity productEntity;

    @BeforeEach
    void setUp() {
        productEntity = ProductEntity.builder()
                .id(101L)
                .ingredientId(10L)
                .productName("Basmati Rice")
                .brand("India Gate")
                .size("1kg")
                .price(new BigDecimal("140.0"))
                .imageUrl("img")
                .source("Cook2Cart")
                .availability("AVAILABLE")
                .updatedAt(LocalDateTime.now())
                .build();

        cartEntity = CartEntity.builder()
                .id(1L)
                .userId(5L)
                .status(CartStatus.ACTIVE)
                .originalServings(4)
                .targetServings(4)
                .totalPrice(new BigDecimal("140.0"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .items(new ArrayList<>())
                .build();

        cartItemEntity = CartItemEntity.builder()
                .id(50L)
                .cart(cartEntity)
                .ingredientId(10L)
                .selectedProductId(101L)
                .recipeId(200L)
                .ingredientName("Rice")
                .recipeQuantity(2.0)
                .recipeUnit("cups")
                .quantity(400.0)
                .unit("g")
                .price(new BigDecimal("140.0"))
                .estimatedPrice(new BigDecimal("140.0"))
                .availableAtHome(false)
                .createdAt(LocalDateTime.now())
                .build();

        cartEntity.getItems().add(cartItemEntity);
    }

    @Test
    void createCart_Success() {
        ProductRequest productReq = new ProductRequest(10L, "Basmati Rice", "India Gate", "1kg", new BigDecimal("140.0"), "img", "Cook2Cart", "AVAILABLE");
        CartItemRequest itemReq = new CartItemRequest(
                10L, null, 200L, "Rice", 2.0, "cups", 400.0, "g",
                new BigDecimal("140.0"), new BigDecimal("140.0"), false, productReq
        );
        CartCreateRequest request = new CartCreateRequest(5L, 4, 4, Collections.singletonList(itemReq));

        when(productRepository.findByIngredientIdAndProductNameIgnoreCaseAndBrandIgnoreCaseAndSizeIgnoreCaseAndSourceIgnoreCase(
                10L, "Basmati Rice", "India Gate", "1kg", "Cook2Cart"))
                .thenReturn(Optional.of(productEntity));
        when(productRepository.save(any(ProductEntity.class))).thenReturn(productEntity);
        when(productRepository.findById(101L)).thenReturn(Optional.of(productEntity));
        when(cartRepository.save(any(CartEntity.class))).thenReturn(cartEntity);

        CartDTO response = cartCatalogService.createCart(request);

        assertNotNull(response);
        assertEquals(1L, response.id());
        assertEquals(5L, response.userId());
        assertEquals(CartStatus.ACTIVE, response.status());
        assertEquals(1, response.items().size());
        assertEquals("Rice", response.items().get(0).ingredientName());
        assertEquals(new BigDecimal("140.0"), response.totalPrice());
        verify(cartRepository, times(1)).save(any(CartEntity.class));
    }

    @Test
    void getCartsByUser_Success() {
        when(cartRepository.findByUserId(5L)).thenReturn(Arrays.asList(cartEntity));
        when(productRepository.findById(101L)).thenReturn(Optional.of(productEntity));

        List<CartDTO> results = cartCatalogService.getCartsByUser(5L);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(1L, results.get(0).id());
        verify(cartRepository, times(1)).findByUserId(5L);
    }

    @Test
    void getCart_Success() {
        when(cartRepository.findById(1L)).thenReturn(Optional.of(cartEntity));
        when(productRepository.findById(101L)).thenReturn(Optional.of(productEntity));

        CartDTO result = cartCatalogService.getCart(1L);

        assertNotNull(result);
        assertEquals(1L, result.id());
        verify(cartRepository, times(1)).findById(1L);
    }

    @Test
    void getCart_NotFound_ThrowsException() {
        when(cartRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
            cartCatalogService.getCart(999L)
        );
    }

    @Test
    void updateStatus_Success() {
        when(cartRepository.findById(1L)).thenReturn(Optional.of(cartEntity));
        when(productRepository.findById(101L)).thenReturn(Optional.of(productEntity));
        when(cartRepository.save(any(CartEntity.class))).thenReturn(cartEntity);

        CartDTO result = cartCatalogService.updateStatus(1L, CartStatus.CHECKED_OUT);

        assertNotNull(result);
        assertEquals(1L, result.id());
        verify(cartRepository, times(1)).findById(1L);
        verify(cartRepository, times(1)).save(any(CartEntity.class));
    }

    @Test
    void saveProduct_Success() {
        ProductRequest productReq = new ProductRequest(10L, "Basmati Rice", "India Gate", "1kg", new BigDecimal("140.0"), "img", "Cook2Cart", "AVAILABLE");
        when(productRepository.findByIngredientIdAndProductNameIgnoreCaseAndBrandIgnoreCaseAndSizeIgnoreCaseAndSourceIgnoreCase(
                10L, "Basmati Rice", "India Gate", "1kg", "Cook2Cart"))
                .thenReturn(Optional.of(productEntity));
        when(productRepository.save(any(ProductEntity.class))).thenReturn(productEntity);
        when(productRepository.findById(101L)).thenReturn(Optional.of(productEntity));

        ProductDTO result = cartCatalogService.saveProduct(productReq);

        assertNotNull(result);
        assertEquals(101L, result.id());
        assertEquals("Basmati Rice", result.productName());
        verify(productRepository, times(1)).save(any(ProductEntity.class));
    }

    @Test
    void getProductsByIngredient_Success() {
        when(productRepository.findByIngredientId(10L)).thenReturn(Arrays.asList(productEntity));
        when(productRepository.findById(101L)).thenReturn(Optional.of(productEntity));

        List<ProductDTO> results = cartCatalogService.getProductsByIngredient(10L);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(101L, results.get(0).id());
        verify(productRepository, times(1)).findByIngredientId(10L);
    }
}
