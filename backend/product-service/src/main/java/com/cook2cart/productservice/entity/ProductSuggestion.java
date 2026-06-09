package com.cook2cart.productservice.entity;

import com.cook2cart.productservice.enums.ProductSource;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_suggestions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long recipeId;

    @Column(nullable = false)
    private Long recipeIngredientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ProductSource source;

    @Column(nullable = false)
    private String productName;

    private String brandName;
    private String imageUrl;
    private String barcode;
    private String packQuantity;

    @Column(precision = 12, scale = 2)
    private BigDecimal marketPrice;

    private String priceUnit;
    private String marketName;
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
