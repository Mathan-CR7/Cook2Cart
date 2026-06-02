package com.cook2cart.ai_service;

import com.cook2cart.ai_service.controller.RecipeController;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.service.RecipeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

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
}
