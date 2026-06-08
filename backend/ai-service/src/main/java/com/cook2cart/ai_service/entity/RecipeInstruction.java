package com.cook2cart.ai_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recipe_instructions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeInstruction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    private Integer stepNumber;

    @Column(columnDefinition = "TEXT")
    private String instruction;
}
