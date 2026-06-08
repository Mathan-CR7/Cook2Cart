package com.cook2cart.ai_service.controller;

import com.cook2cart.ai_service.entity.AiRecipeResponse;
import com.cook2cart.ai_service.dto.CombineSourcesRequest;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.dto.StoreProduct;
import com.cook2cart.ai_service.service.RecipeCacheService;
import com.cook2cart.ai_service.service.RecipeService;
import com.cook2cart.ai_service.repository.RecipeResponseRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ai/recipe")
public class RecipeController {

    private static final Logger log = LoggerFactory.getLogger(RecipeController.class);
    private final RecipeService recipeService;
    private final RecipeCacheService recipeCacheService;
    private final RecipeResponseRepository recipeRepository;
    private final ObjectMapper objectMapper;

    public RecipeController(RecipeService recipeService, RecipeCacheService recipeCacheService, RecipeResponseRepository recipeRepository, ObjectMapper objectMapper) {
        this.recipeService = recipeService;
        this.recipeCacheService = recipeCacheService;
        this.recipeRepository = recipeRepository;
        this.objectMapper = objectMapper;
    }

    @PostMapping(value = "/process", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RecipeResponse> processRecipeAudio(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "videoId", required = false) String videoId
    ) {
        log.info("Received request to process recipe audio. Filename: {}, Size: {} bytes", 
                file.getOriginalFilename(), file.getSize());

        if (videoId != null && !videoId.isBlank()) {
            var cachedRecipe = recipeCacheService.getRecipe(videoId);
            if (cachedRecipe.isPresent()) {
                return ResponseEntity.ok(cachedRecipe.get());
            }
        }
        
        RecipeResponse response = recipeService.processRecipeAudio(file);
        if (response != null) {
            AiRecipeResponse saved = recipeRepository.save(toAuditEntity(response));
            response.setId(saved.getId());
            recipeCacheService.cacheRecipe(videoId, response);
        }
        return ResponseEntity.ok(response);
    }

    public ResponseEntity<RecipeResponse> processRecipeAudio(MultipartFile file) {
        return processRecipeAudio(file, null);
    }

    @PostMapping(value = "/combine", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RecipeResponse> combineIngredients(@RequestBody CombineSourcesRequest request) {
        log.info("Received request to combine recipe ingredients from multiple sources. Speech Transcript length: {}",
                request.getSpeechTranscript() != null ? request.getSpeechTranscript().length() : 0);
        RecipeResponse response = recipeService.combineIngredients(request);
        if (response != null) {
            AiRecipeResponse saved = recipeRepository.save(toAuditEntity(response));
            response.setId(saved.getId());
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/parse-ingredients", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<java.util.List<com.cook2cart.ai_service.dto.Ingredient>> parseIngredients(
            @RequestBody java.util.List<com.cook2cart.ai_service.dto.Ingredient> ingredients,
            @RequestParam(value = "servings", defaultValue = "2") int servings) {
        log.info("Received request to parse ingredients dynamically. Size: {}, Servings: {}", 
                ingredients.size(), servings);
        java.util.List<com.cook2cart.ai_service.dto.Ingredient> response = recipeService.parseIngredients(ingredients, servings);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/update-prices", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<StoreProduct>> updateLatestPrices(@RequestBody List<StoreProduct> products) {
        log.info("Received request to update latest prices for {} products dynamically using AI.", products.size());
        List<StoreProduct> response = recipeService.updateLatestPrices(products);
        return ResponseEntity.ok(response);
    }

    private AiRecipeResponse toAuditEntity(RecipeResponse response) {
        Double confidenceScore = resolveConfidenceScore(response);
        response.setConfidenceScore(confidenceScore);

        return AiRecipeResponse.builder()
                .englishTranscript(response.getEnglishTranscript())
                .rawAiResponse(toJson(response))
                .languageDetected(response.getLanguageDetected())
                .confidenceScore(confidenceScore)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private Double resolveConfidenceScore(RecipeResponse response) {
        if (response.getConfidenceScore() != null) {
            return response.getConfidenceScore();
        }

        if (response.getIngredients() == null || response.getIngredients().isEmpty()) {
            return 0.0;
        }

        double averageConfidence = response.getIngredients().stream()
                .mapToDouble(com.cook2cart.ai_service.dto.Ingredient::getConfidence)
                .filter(score -> score > 0.0)
                .average()
                .orElse(0.0);

        return Math.round(averageConfidence * 100.0) / 100.0;
    }

    private String toJson(RecipeResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize AI recipe response for audit storage", e);
            return null;
        }
    }
}
