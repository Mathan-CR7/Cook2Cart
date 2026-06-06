package com.cook2cart.ai_service.controller;

import com.cook2cart.ai_service.dto.CombineSourcesRequest;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.dto.StoreProduct;
import com.cook2cart.ai_service.service.RecipeService;
import com.cook2cart.ai_service.repository.RecipeResponseRepository;
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
    private final RecipeResponseRepository recipeRepository;

    public RecipeController(RecipeService recipeService, RecipeResponseRepository recipeRepository) {
        this.recipeService = recipeService;
        this.recipeRepository = recipeRepository;
    }

    @PostMapping(value = "/process", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RecipeResponse> processRecipeAudio(@RequestParam("file") MultipartFile file) {
        log.info("Received request to process recipe audio. Filename: {}, Size: {} bytes", 
                file.getOriginalFilename(), file.getSize());
        
        RecipeResponse response = recipeService.processRecipeAudio(file);
        if (response != null) {
            response = recipeRepository.save(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/combine", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RecipeResponse> combineIngredients(@RequestBody CombineSourcesRequest request) {
        log.info("Received request to combine recipe ingredients from multiple sources. Speech Transcript length: {}",
                request.getSpeechTranscript() != null ? request.getSpeechTranscript().length() : 0);
        RecipeResponse response = recipeService.combineIngredients(request);
        if (response != null) {
            response = recipeRepository.save(response);
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

}
