package com.cook2cart.ai_service;

import com.cook2cart.ai_service.controller.RecipeController;
import com.cook2cart.ai_service.dto.CombineSourcesRequest;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.service.RecipeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "gemini.api.key=")
class AiServiceApplicationTests {

    @Autowired
    private RecipeService recipeService;

    @Autowired
    private RecipeController recipeController;

    @Test
    void contextLoads() {
        assertNotNull(recipeService);
        assertNotNull(recipeController);
    }

    @Test
    void testProcessRecipeAudio_CookiesFallback() throws Exception {
        MockMultipartFile audioFile = new MockMultipartFile(
                "file",
                "chocolate_chip_cookies.mp3",
                "audio/mp3",
                "mock-audio-data-greater-than-3mb-so-we-can-trigger-the-cookie-fallback".repeat(50000).getBytes()
        );

        RecipeResponse response = recipeService.processRecipeAudio(audioFile);
        assertNotNull(response);
        assertEquals("en", response.getLanguageDetected());
        assertTrue(response.getEnglishTranscript().contains("chocolate chip cookies"));
        
        // Assert first ingredient (unsalted butter: 1 cup -> 227g, source: speech, confidence: 0.98)
        assertEquals("unsalted butter", response.getIngredients().get(0).getName());
        assertEquals(1.0, response.getIngredients().get(0).getRecipeQuantity());
        assertEquals("cup", response.getIngredients().get(0).getRecipeUnit());
        assertEquals(227.0, response.getIngredients().get(0).getQuantity());
        assertEquals("g", response.getIngredients().get(0).getUnit());
        assertFalse(response.getIngredients().get(0).isEstimated());
        assertEquals("speech", response.getIngredients().get(0).getSource());
        assertEquals(0.98, response.getIngredients().get(0).getConfidence());

        // Assert egg ingredient (2 eggs -> recipeQuantity: 2, recipeUnit: null -> unit: pieces, estimated: false)
        assertEquals("large eggs", response.getIngredients().get(3).getName());
        assertEquals(2.0, response.getIngredients().get(3).getRecipeQuantity());
        assertNull(response.getIngredients().get(3).getRecipeUnit());
        assertEquals(2.0, response.getIngredients().get(3).getQuantity());
        assertEquals("pieces", response.getIngredients().get(3).getUnit());
        assertFalse(response.getIngredients().get(3).isEstimated());

        ResponseEntity<RecipeResponse> controllerResponse = recipeController.processRecipeAudio(audioFile);
        assertNotNull(controllerResponse);
        assertEquals(200, controllerResponse.getStatusCode().value());
        assertEquals(response, controllerResponse.getBody());
    }

    @Test
    void testProcessRecipeAudio_PastaFallback() throws Exception {
        MockMultipartFile audioFile = new MockMultipartFile(
                "file",
                "simple_pasta_recipe.wav",
                "audio/wav",
                "mock-audio-data".getBytes()
        );

        RecipeResponse response = recipeService.processRecipeAudio(audioFile);
        assertNotNull(response);
        assertEquals("en", response.getLanguageDetected());
        assertTrue(response.getEnglishTranscript().contains("simple pasta"));
        
        // Assert first ingredient (spaghetti: 8 ounces -> 227g)
        assertEquals("spaghetti", response.getIngredients().get(0).getName());
        assertEquals(8.0, response.getIngredients().get(0).getRecipeQuantity());
        assertEquals("ounce", response.getIngredients().get(0).getRecipeUnit());
        assertEquals(226.8, response.getIngredients().get(0).getQuantity());
        assertEquals("g", response.getIngredients().get(0).getUnit());
        assertFalse(response.getIngredients().get(0).isEstimated());

        // Assert second ingredient (olive oil: 2 tablespoons -> 30ml)
        assertEquals("olive oil", response.getIngredients().get(1).getName());
        assertEquals(2.0, response.getIngredients().get(1).getRecipeQuantity());
        assertEquals("tablespoon", response.getIngredients().get(1).getRecipeUnit());
        assertEquals(30.0, response.getIngredients().get(1).getQuantity());
        assertEquals("ml", response.getIngredients().get(1).getUnit());
        assertFalse(response.getIngredients().get(1).isEstimated());

        // Assert estimated ingredient (fresh basil leaves -> estimated: true, quantity: 1, unit: pieces)
        assertEquals("fresh basil leaves", response.getIngredients().get(5).getName());
        assertTrue(response.getIngredients().get(5).isEstimated());
        assertEquals(1.0, response.getIngredients().get(5).getRecipeQuantity());
        assertEquals("piece", response.getIngredients().get(5).getRecipeUnit());
        assertEquals(1.0, response.getIngredients().get(5).getQuantity());
        assertEquals("pieces", response.getIngredients().get(5).getUnit());
        assertEquals("vision", response.getIngredients().get(5).getSource());

        ResponseEntity<RecipeResponse> controllerResponse = recipeController.processRecipeAudio(audioFile);
        assertNotNull(controllerResponse);
        assertEquals(200, controllerResponse.getStatusCode().value());
        assertEquals(response, controllerResponse.getBody());
    }

    @Test
    void testMultilingualIngredientTranslation() {
        // Spanish, Tamil, Telugu, French, German
        com.cook2cart.ai_service.dto.Ingredient cebolla = new com.cook2cart.ai_service.dto.Ingredient("fresh cebolla", 1.0, "piece", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(cebolla, "serves 2");
        assertEquals("onion", cebolla.getName());

        com.cook2cart.ai_service.dto.Ingredient vengayam = new com.cook2cart.ai_service.dto.Ingredient("vengayam", 1.0, "piece", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(vengayam, "serves 2");
        assertEquals("onion", vengayam.getName());

        com.cook2cart.ai_service.dto.Ingredient allam = new com.cook2cart.ai_service.dto.Ingredient("allam paste", 1.0, "piece", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(allam, "serves 2");
        assertEquals("ginger", allam.getName());

        com.cook2cart.ai_service.dto.Ingredient oignon = new com.cook2cart.ai_service.dto.Ingredient("oignon", 1.0, "piece", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(oignon, "serves 2");
        assertEquals("onion", oignon.getName());

        com.cook2cart.ai_service.dto.Ingredient knoblauch = new com.cook2cart.ai_service.dto.Ingredient("knoblauch", 1.0, "piece", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(knoblauch, "serves 2");
        assertEquals("garlic", knoblauch.getName());
    }

    @Test
    void testRegionalAndNonStandardConversions() {
        // 1 glass = 200 ml, 1 tumbler = 250 ml, 1 katori = 150 ml/g
        com.cook2cart.ai_service.dto.Ingredient waterGlass = new com.cook2cart.ai_service.dto.Ingredient("water", 2.0, "glass", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(waterGlass, "");
        assertEquals(400.0, waterGlass.getQuantity());
        assertEquals("ml", waterGlass.getUnit());

        com.cook2cart.ai_service.dto.Ingredient milkTumbler = new com.cook2cart.ai_service.dto.Ingredient("milk", 1.5, "tumbler", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(milkTumbler, "");
        assertEquals(375.0, milkTumbler.getQuantity());
        assertEquals("ml", milkTumbler.getUnit());

        com.cook2cart.ai_service.dto.Ingredient sugarKatori = new com.cook2cart.ai_service.dto.Ingredient("sugar", 1.0, "katori", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(sugarKatori, "");
        assertEquals(150.0, sugarKatori.getQuantity());
        assertEquals("g", sugarKatori.getUnit());

        // Pinch and handful conversions
        com.cook2cart.ai_service.dto.Ingredient saltPinch = new com.cook2cart.ai_service.dto.Ingredient("salt", 2.0, "pinch", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(saltPinch, "");
        assertEquals("g", saltPinch.getUnit());
        assertEquals(1.0, saltPinch.getQuantity());
        assertTrue(saltPinch.isEstimated());

        com.cook2cart.ai_service.dto.Ingredient peanutHandful = new com.cook2cart.ai_service.dto.Ingredient("peanuts", 1.0, "handful", false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(peanutHandful, "");
        assertEquals("g", peanutHandful.getUnit());
        assertEquals(30.0, peanutHandful.getQuantity());
        assertTrue(peanutHandful.isEstimated());
    }

    @Test
    void testServingBasedDynamicScaling() {
        // Serves 4 -> twice the standard default serving size of 2
        // Default standard quantities per person: oil = 15ml, rice = 100g, salt = 2g
        // So for 4 people, rice = 4 * 100 = 400g, oil = 4 * 15 = 60ml
        com.cook2cart.ai_service.dto.Ingredient rice = new com.cook2cart.ai_service.dto.Ingredient("rice", null, null, false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(rice, "This is a recipe for 4 people");
        assertTrue(rice.isEstimated());
        assertEquals(400.0, rice.getQuantity());
        assertEquals("g", rice.getUnit());

        com.cook2cart.ai_service.dto.Ingredient oil = new com.cook2cart.ai_service.dto.Ingredient("cooking oil", null, null, false, "speech", 0.95);
        com.cook2cart.ai_service.util.MetricConverter.convertToMetric(oil, "serves 3");
        assertTrue(oil.isEstimated());
        assertEquals(45.0, oil.getQuantity());
        assertEquals("ml", oil.getUnit());
    }

    @Test
    void testCombineIngredients_RegionalTranslationAndMerging() {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Add onions and mirchi.",
                "Add onions",
                Arrays.asList("Pyaz", "hari mirch"),
                2
        );

        RecipeResponse response = recipeService.combineIngredients(request);
        assertNotNull(response);
        
        List<com.cook2cart.ai_service.dto.Ingredient> ingredients = response.getIngredients();
        assertNotNull(ingredients);
        assertEquals(2, ingredients.size());

        // Verify onion is merged and source combined
        com.cook2cart.ai_service.dto.Ingredient onion = ingredients.stream()
                .filter(i -> "onion".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(onion);
        assertEquals("speech+ocr+vision", onion.getSource());
        // combined confidence: 1 - (1-0.95)*(1-0.90)*(1-0.85) = 1 - 0.05*0.10*0.15 = 1 - 0.00075 = 0.99925 -> 1.0
        assertEquals(1.0, onion.getConfidence());

        // Verify green chilli is translated and merged
        com.cook2cart.ai_service.dto.Ingredient greenChilli = ingredients.stream()
                .filter(i -> "green chilli".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(greenChilli);
        assertEquals("speech+vision", greenChilli.getSource());
        // combined confidence: 1 - (1-0.95)*(1-0.85) = 1 - 0.05*0.15 = 1 - 0.0075 = 0.9925 -> 0.99
        assertEquals(0.99, greenChilli.getConfidence());
    }

    @Test
    void testCombineIngredients_OcrOrVisionOnlySources() {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Boil spaghetti.",
                "Add 1 tablespoon olive oil",
                Arrays.asList("fresh basil leaves"),
                2
        );

        RecipeResponse response = recipeService.combineIngredients(request);
        assertNotNull(response);
        
        List<com.cook2cart.ai_service.dto.Ingredient> ingredients = response.getIngredients();
        assertNotNull(ingredients);
        assertEquals(3, ingredients.size());

        // Spaghetti: speech
        com.cook2cart.ai_service.dto.Ingredient spaghetti = ingredients.stream()
                .filter(i -> "spaghetti".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(spaghetti);
        assertEquals("speech", spaghetti.getSource());
        assertEquals(0.95, spaghetti.getConfidence());

        // Olive oil: ocr
        com.cook2cart.ai_service.dto.Ingredient oliveOil = ingredients.stream()
                .filter(i -> "olive oil".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(oliveOil);
        assertEquals("ocr", oliveOil.getSource());
        assertEquals(0.90, oliveOil.getConfidence());
        assertEquals(1.0, oliveOil.getRecipeQuantity());
        assertEquals("tablespoon", oliveOil.getRecipeUnit());

        // Fresh basil leaves: vision
        com.cook2cart.ai_service.dto.Ingredient basil = ingredients.stream()
                .filter(i -> "fresh basil leaves".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(basil);
        assertEquals("vision", basil.getSource());
        assertEquals(0.85, basil.getConfidence());
        assertTrue(basil.isEstimated());
    }

    @Test
    void testCombineIngredients_QuantityEstimationByPeopleCount() {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "This serves 3 people.",
                "",
                Arrays.asList("onion", "cooking oil"),
                3
        );

        RecipeResponse response = recipeService.combineIngredients(request);
        assertNotNull(response);
        
        List<com.cook2cart.ai_service.dto.Ingredient> ingredients = response.getIngredients();
        assertNotNull(ingredients);
        assertEquals(2, ingredients.size());

        // Onion: vision, serves 3 -> 3 * 50 = 150g
        com.cook2cart.ai_service.dto.Ingredient onion = ingredients.stream()
                .filter(i -> "onion".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(onion);
        assertEquals("vision", onion.getSource());
        assertTrue(onion.isEstimated());
        assertEquals(150.0, onion.getQuantity());
        assertEquals("g", onion.getUnit());

        // Cooking oil (contains 'oil'): vision, serves 3 -> 3 * 15 = 45ml
        com.cook2cart.ai_service.dto.Ingredient oil = ingredients.stream()
                .filter(i -> "cooking oil".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(oil);
        assertEquals("vision", oil.getSource());
        assertTrue(oil.isEstimated());
        assertEquals(45.0, oil.getQuantity());
        assertEquals("ml", oil.getUnit());
    }

    @Test
    void testCombineIngredients_MasalaInference() {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Roast coriander seeds, cumin seeds, cloves and cinnamon. Grind them into powder. Later add one spoon masala.",
                "Add 1 tsp masala",
                Arrays.asList(),
                2
        );

        RecipeResponse response = recipeService.combineIngredients(request);
        assertNotNull(response);
        
        List<com.cook2cart.ai_service.dto.Ingredient> ingredients = response.getIngredients();
        assertNotNull(ingredients);
        
        // "masala" should be removed, and 4 constituent ingredients should be inferred
        assertEquals(4, ingredients.size());
        
        // Assert absence of masala
        assertTrue(ingredients.stream().noneMatch(i -> i.getName().contains("masala")));

        // Verify coriander seeds inferred and quantity populated from masala
        com.cook2cart.ai_service.dto.Ingredient coriander = ingredients.stream()
                .filter(i -> "coriander seeds".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(coriander);
        assertEquals("speech+ocr", coriander.getSource());
        assertEquals(1.0, coriander.getRecipeQuantity());
        // combined confidence: 1 - (1-0.95)*(1-0.90) = 1 - 0.05*0.1 = 1 - 0.005 = 0.995 -> 1.0
        assertEquals(1.0, coriander.getConfidence());

        // Verify other ingredients
        assertTrue(ingredients.stream().anyMatch(i -> "cumin seeds".equals(i.getName())));
        assertTrue(ingredients.stream().anyMatch(i -> "cloves".equals(i.getName())));
        assertTrue(ingredients.stream().anyMatch(i -> "cinnamon".equals(i.getName())));
    }

    @Test
    void testCombineIngredients_ControllerEndpoint() {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Add eggs and milk.",
                "Add 1 cup milk",
                Arrays.asList("egg"),
                2
        );

        ResponseEntity<RecipeResponse> responseEntity = recipeController.combineIngredients(request);
        assertNotNull(responseEntity);
        assertEquals(200, responseEntity.getStatusCode().value());
        
        RecipeResponse response = responseEntity.getBody();
        assertNotNull(response);
        
        List<com.cook2cart.ai_service.dto.Ingredient> ingredients = response.getIngredients();
        assertNotNull(ingredients);
        assertEquals(2, ingredients.size());
    }
}
