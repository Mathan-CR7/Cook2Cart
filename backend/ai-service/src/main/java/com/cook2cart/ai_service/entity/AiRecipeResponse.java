package com.cook2cart.ai_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_recipe_response")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiRecipeResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long recipeId;

    @Column(columnDefinition = "TEXT")
    private String englishTranscript;

    @Column(columnDefinition = "TEXT")
    private String rawAiResponse;

    private String languageDetected;

    private Double confidenceScore;

    private LocalDateTime createdAt;
}
