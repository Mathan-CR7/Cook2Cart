package com.cook2cart.cart_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cart_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private CartEntity cart;

    private Long ingredientId;

    private Long selectedProductId;

    private Long recipeId;

    private String ingredientName;

    private Double recipeQuantity;

    private String recipeUnit;

    private Double quantity;

    private String unit;

    private BigDecimal price;

    private BigDecimal estimatedPrice;

    private Boolean availableAtHome;

    private LocalDateTime createdAt;
}
