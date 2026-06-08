package com.cook2cart.ai_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "ingredients",
        uniqueConstraints = @UniqueConstraint(name = "uk_ingredients_name", columnNames = "name")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;
}
