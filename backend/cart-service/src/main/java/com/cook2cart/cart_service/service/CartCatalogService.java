package com.cook2cart.cart_service.service;

import com.cook2cart.cart_service.dto.*;
import com.cook2cart.cart_service.entity.*;
import com.cook2cart.cart_service.repository.CartEntityRepository;
import com.cook2cart.cart_service.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartCatalogService {

    private final CartEntityRepository cartRepository;
    private final ProductRepository productRepository;

    @Transactional
    public CartDTO createCart(CartCreateRequest request) {
        LocalDateTime now = LocalDateTime.now();
        CartEntity cart = CartEntity.builder()
                .userId(request.userId())
                .status(CartStatus.ACTIVE)
                .originalServings(request.originalServings() == null ? 4 : request.originalServings())
                .targetServings(request.targetServings() == null ? 4 : request.targetServings())
                .totalPrice(BigDecimal.ZERO)
                .createdAt(now)
                .updatedAt(now)
                .build();

        if (request.items() != null) {
            request.items().forEach(item -> {
                ProductEntity selectedProduct = resolveProduct(item);
                BigDecimal price = item.price() != null
                        ? item.price()
                        : selectedProduct != null && selectedProduct.getPrice() != null
                        ? selectedProduct.getPrice()
                        : item.estimatedPrice();

                cart.getItems().add(CartItemEntity.builder()
                            .cart(cart)
                            .ingredientId(item.ingredientId())
                            .selectedProductId(selectedProduct != null ? selectedProduct.getId() : item.selectedProductId())
                            .recipeId(item.recipeId())
                            .ingredientName(item.ingredientName())
                            .recipeQuantity(item.recipeQuantity())
                            .recipeUnit(item.recipeUnit())
                            .quantity(item.quantity())
                            .unit(item.unit())
                            .price(price == null ? BigDecimal.ZERO : price)
                            .estimatedPrice(item.estimatedPrice() == null ? BigDecimal.ZERO : item.estimatedPrice())
                            .availableAtHome(Boolean.TRUE.equals(item.availableAtHome()))
                            .createdAt(now)
                            .build());
            });
        }

        cart.setTotalPrice(calculateTotal(cart));
        return toCartDTO(cartRepository.save(cart));
    }

    public List<CartDTO> getCartsByUser(Long userId) {
        return cartRepository.findByUserId(userId).stream().map(this::toCartDTO).toList();
    }

    public CartDTO getCart(Long cartId) {
        return toCartDTO(cartRepository.findById(cartId).orElseThrow(() -> new RuntimeException("Cart not found")));
    }

    public CartDTO updateStatus(Long cartId, CartStatus status) {
        CartEntity cart = cartRepository.findById(cartId).orElseThrow(() -> new RuntimeException("Cart not found"));
        cart.setStatus(status);
        cart.setUpdatedAt(LocalDateTime.now());
        return toCartDTO(cartRepository.save(cart));
    }

    public ProductDTO saveProduct(ProductRequest request) {
        return toProductDTO(saveProductEntity(request).getId());
    }

    public List<ProductDTO> getProductsByIngredient(Long ingredientId) {
        return productRepository.findByIngredientId(ingredientId).stream()
                .map(product -> toProductDTO(product.getId()))
                .toList();
    }

    private BigDecimal calculateTotal(CartEntity cart) {
        return cart.getItems().stream()
                .filter(item -> !Boolean.TRUE.equals(item.getAvailableAtHome()))
                .map(item -> item.getPrice() == null ? BigDecimal.ZERO : item.getPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private ProductEntity resolveProduct(CartItemRequest item) {
        ProductRequest product = item.selectedProduct();
        if (product == null) {
            return item.selectedProductId() == null
                    ? null
                    : productRepository.findById(item.selectedProductId()).orElse(null);
        }

        return saveProductEntity(new ProductRequest(
                item.ingredientId(),
                firstNonBlank(product.productName(), item.ingredientName(), "Product"),
                product.brand(),
                firstNonBlank(product.size(), item.quantity() + " " + item.unit(), "1 unit"),
                product.price(),
                product.imageUrl(),
                product.source(),
                product.availability()
        ));
    }

    private ProductEntity saveProductEntity(ProductRequest product) {
        Long ingredientId = product.ingredientId();
        String productName = firstNonBlank(product.productName(), "Product");
        String brand = firstNonBlank(product.brand(), "Generic");
        String size = firstNonBlank(product.size(), "1 unit");
        String source = firstNonBlank(product.source(), "Cook2Cart");
        LocalDateTime now = LocalDateTime.now();

        ProductEntity entity = ingredientId == null
                ? null
                : productRepository
                .findByIngredientIdAndProductNameIgnoreCaseAndBrandIgnoreCaseAndSizeIgnoreCaseAndSourceIgnoreCase(
                        ingredientId,
                        productName,
                        brand,
                        size,
                        source
                )
                .orElse(null);

        if (entity == null) {
            entity = ProductEntity.builder()
                    .ingredientId(ingredientId)
                    .productName(productName)
                    .brand(brand)
                    .size(size)
                    .source(source)
                    .build();
        }

        entity.setPrice(product.price() == null ? BigDecimal.ZERO : product.price());
        entity.setImageUrl(product.imageUrl());
        entity.setAvailability(firstNonBlank(product.availability(), "AVAILABLE"));
        entity.setUpdatedAt(now);
        return productRepository.save(entity);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private CartDTO toCartDTO(CartEntity cart) {
        List<CartItemDTO> items = cart.getItems().stream()
                .map(item -> new CartItemDTO(
                        item.getId(),
                        item.getIngredientId(),
                        item.getSelectedProductId(),
                        item.getRecipeId(),
                        item.getIngredientName(),
                        item.getRecipeQuantity(),
                        item.getRecipeUnit(),
                        item.getQuantity(),
                        item.getUnit(),
                        item.getPrice(),
                        item.getEstimatedPrice(),
                        item.getAvailableAtHome(),
                        toProductDTO(item.getSelectedProductId())
                ))
                .toList();

        return new CartDTO(
                cart.getId(),
                cart.getUserId(),
                cart.getStatus(),
                cart.getTotalPrice(),
                cart.getOriginalServings(),
                cart.getTargetServings(),
                cart.getCreatedAt(),
                cart.getUpdatedAt(),
                items
        );
    }

    private ProductDTO toProductDTO(Long productId) {
        if (productId == null) {
            return null;
        }

        return productRepository.findById(productId)
                .map(product -> new ProductDTO(
                        product.getId(),
                        product.getIngredientId(),
                        product.getProductName(),
                        product.getBrand(),
                        product.getSize(),
                        product.getPrice(),
                        product.getImageUrl(),
                        product.getSource(),
                        product.getAvailability(),
                        product.getUpdatedAt()
                ))
                .orElse(null);
    }
}
