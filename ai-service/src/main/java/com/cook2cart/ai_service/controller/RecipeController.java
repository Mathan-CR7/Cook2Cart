package com.cook2cart.ai_service.controller;

import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.service.RecipeService;
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

    public RecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }

    @PostMapping(value = "/process", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RecipeResponse> processRecipeAudio(@RequestParam("file") MultipartFile file) {
        log.info("Received request to process recipe audio. Filename: {}, Size: {} bytes", 
                file.getOriginalFilename(), file.getSize());
        
        RecipeResponse response = recipeService.processRecipeAudio(file);
        return ResponseEntity.ok(response);
    }
}
