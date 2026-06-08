package com.cook2cart.cart_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long ingredientId;

    private String productName;

    private String brand;

    private String size;

    private BigDecimal price;

    private String imageUrl;

    private String source;

    private String availability;

    private LocalDateTime updatedAt;
}
