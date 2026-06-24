package com.cook2cart.ai_service;

import com.cook2cart.ai_service.controller.RecipeController;
import com.cook2cart.ai_service.dto.CombineSourcesRequest;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.service.RecipeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.client.RestTemplate;
import org.mockito.Mockito;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"gemini.api.key=dummy-test-key", "youtube.api.key=dummy-test-key"})
class AiServiceApplicationTests {

    @Autowired
    private RecipeService recipeService;

    @Autowired
    private RecipeController recipeController;

    @MockitoBean
    private RestTemplate restTemplate;

    private String createGeminiResponseJson(Object responseData) throws Exception {
        String innerJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(responseData);
        return "{\n" +
               "  \"candidates\": [\n" +
               "    {\n" +
               "      \"content\": {\n" +
               "        \"parts\": [\n" +
               "          {\n" +
               "            \"text\": " + new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(innerJson) + "\n" +
               "          }\n" +
               "        ]\n" +
               "      }\n" +
               "    }\n" +
               "  ]\n" +
               "}";
    }

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

        RecipeResponse expectedResponse = new RecipeResponse(
                "en",
                "To make the perfect chocolate chip cookies, you'll need the following ingredients. Start with one cup of unsalted butter, softened. Then add three quarters of a cup of granulated sugar and three quarters of a cup of packed brown sugar. Next, mix in two large eggs and two teaspoons of vanilla extract. For the dry ingredients, you will need two and a quarter cups of all purpose flour, one teaspoon of baking soda, and half a teaspoon of salt. Finally, fold in two cups of semi sweet chocolate chips.",
                Arrays.asList(
                        new com.cook2cart.ai_service.dto.Ingredient("unsalted butter", 1.0, "cup", false, "speech", 0.98),
                        new com.cook2cart.ai_service.dto.Ingredient("granulated sugar", 0.75, "cup", false, "speech", 0.97),
                        new com.cook2cart.ai_service.dto.Ingredient("packed brown sugar", 0.75, "cup", false, "speech", 0.97),
                        new com.cook2cart.ai_service.dto.Ingredient("large eggs", 2.0, null, false, "speech", 0.95),
                        new com.cook2cart.ai_service.dto.Ingredient("vanilla extract", 2.0, "teaspoon", false, "speech", 0.98),
                        new com.cook2cart.ai_service.dto.Ingredient("all purpose flour", 2.25, "cup", false, "speech", 0.99),
                        new com.cook2cart.ai_service.dto.Ingredient("baking soda", 1.0, "teaspoon", false, "speech", 0.96),
                        new com.cook2cart.ai_service.dto.Ingredient("salt", 0.5, "teaspoon", false, "speech", 0.98),
                        new com.cook2cart.ai_service.dto.Ingredient("semi sweet chocolate chips", 2.0, "cup", false, "speech", 0.98)
                ),
                Arrays.asList(
                        "Preheat oven to 375°F (190°C).",
                        "Cream the softened butter, granulated sugar, and brown sugar until smooth.",
                        "Beat in the eggs one at a time, then stir in the vanilla extract.",
                        "Combine the flour, baking soda, and salt, then gradually stir into the creamed mixture.",
                        "Fold in the chocolate chips and drop large spoonfuls onto ungreased pans.",
                        "Bake for 9 to 11 minutes or until golden brown."
                )
        );
        expectedResponse.setNutrition(new com.cook2cart.ai_service.dto.Nutrition("200 kcal", "2g", "28g", "10g", "Vitamin A, Iron"));
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

        RecipeResponse response = recipeService.processRecipeAudio(audioFile, "chocolate_chip_cookies");
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

        RecipeResponse expectedResponse = new RecipeResponse(
                "en",
                "Today we are going to make a simple pasta. First, boil some water and add eight ounces of spaghetti. While that's cooking, heat two tablespoons of olive oil in a pan. Add three cloves of minced garlic and cook until fragrant. Then, toss in one cup of cherry tomatoes, halved, and cook for about three minutes. Finally, mix in half a cup of grated parmesan cheese and a handful of fresh basil leaves. Season with salt and pepper to taste.",
                Arrays.asList(
                        new com.cook2cart.ai_service.dto.Ingredient("spaghetti", 8.0, "ounce", false, "speech", 0.97),
                        new com.cook2cart.ai_service.dto.Ingredient("olive oil", 2.0, "tablespoon", false, "speech", 0.99),
                        new com.cook2cart.ai_service.dto.Ingredient("minced garlic", 3.0, "clove", false, "speech", 0.95),
                        new com.cook2cart.ai_service.dto.Ingredient("cherry tomatoes", 1.0, "cup", false, "speech", 0.96),
                        new com.cook2cart.ai_service.dto.Ingredient("grated parmesan cheese", 0.5, "cup", false, "speech", 0.94),
                        new com.cook2cart.ai_service.dto.Ingredient("fresh basil leaves", null, null, true, "vision", 0.85)
                ),
                Arrays.asList(
                        "Bring a large pot of salted water to a boil and cook the spaghetti.",
                        "Heat olive oil in a pan and fry the minced garlic until fragrant.",
                        "Add the halved cherry tomatoes and cook for 3 minutes.",
                        "Drain spaghetti and toss with the garlic and tomatoes.",
                        "Top with parmesan cheese and fresh basil leaves."
                )
        );
        expectedResponse.setNutrition(new com.cook2cart.ai_service.dto.Nutrition("350 kcal", "10g", "45g", "12g", "Vitamin C, Calcium"));
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

        RecipeResponse response = recipeService.processRecipeAudio(audioFile, "simple_pasta_recipe");
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
    void testCombineIngredients_RegionalTranslationAndMerging() throws Exception {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Add onions and mirchi.",
                "Add onions",
                Arrays.asList("Pyaz", "hari mirch"),
                2
        );

        RecipeResponse expectedResponse = new RecipeResponse();
        expectedResponse.setLanguageDetected("en");
        expectedResponse.setEnglishTranscript("Add onions and mirchi.");
        expectedResponse.setIngredients(Arrays.asList(
                new com.cook2cart.ai_service.dto.Ingredient("onion", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("mirchi", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("onion", null, null, false, "ocr", 0.90),
                new com.cook2cart.ai_service.dto.Ingredient("Pyaz", null, null, false, "vision", 0.85),
                new com.cook2cart.ai_service.dto.Ingredient("hari mirch", null, null, false, "vision", 0.85)
        ));
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

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
                .filter(i -> "green chili".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(greenChilli);
        assertEquals("speech+vision", greenChilli.getSource());
        // combined confidence: 1 - (1-0.95)*(1-0.85) = 1 - 0.05*0.15 = 1 - 0.0075 = 0.9925 -> 0.99
        assertEquals(0.99, greenChilli.getConfidence());
    }

    @Test
    void testCombineIngredients_OcrOrVisionOnlySources() throws Exception {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Boil spaghetti.",
                "Add 1 tablespoon olive oil",
                Arrays.asList("fresh basil leaves"),
                2
        );

        RecipeResponse expectedResponse = new RecipeResponse();
        expectedResponse.setLanguageDetected("en");
        expectedResponse.setEnglishTranscript("Boil spaghetti.");
        expectedResponse.setIngredients(Arrays.asList(
                new com.cook2cart.ai_service.dto.Ingredient("spaghetti", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("olive oil", 1.0, "tablespoon", false, "ocr", 0.90),
                new com.cook2cart.ai_service.dto.Ingredient("fresh basil leaves", null, null, true, "vision", 0.85)
        ));
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

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
    void testCombineIngredients_QuantityEstimationByPeopleCount() throws Exception {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "This serves 3 people.",
                "",
                Arrays.asList("onion", "cooking oil"),
                3
        );

        RecipeResponse expectedResponse = new RecipeResponse();
        expectedResponse.setLanguageDetected("en");
        expectedResponse.setEnglishTranscript("This serves 3 people.");
        expectedResponse.setIngredients(Arrays.asList(
                new com.cook2cart.ai_service.dto.Ingredient("onion", null, null, false, "vision", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("cooking oil", null, null, false, "vision", 0.95)
        ));
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

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
    void testCombineIngredients_MasalaInference() throws Exception {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Roast coriander seeds, cumin seeds, cloves and cinnamon. Grind them into powder. Later add one spoon masala.",
                "Add 1 tsp masala",
                Arrays.asList(),
                2
        );

        RecipeResponse expectedResponse = new RecipeResponse();
        expectedResponse.setLanguageDetected("en");
        expectedResponse.setEnglishTranscript("Roast coriander seeds, cumin seeds, cloves and cinnamon. Grind them into powder. Later add one spoon masala.");
        expectedResponse.setIngredients(Arrays.asList(
                new com.cook2cart.ai_service.dto.Ingredient("coriander seeds", 1.0, null, false, "speech+ocr", 1.0),
                new com.cook2cart.ai_service.dto.Ingredient("cumin seeds", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("cloves", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("cinnamon", null, null, false, "speech", 0.95)
        ));
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

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
    void testCombineIngredients_ControllerEndpoint() throws Exception {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Add eggs and milk.",
                "Add 1 cup milk",
                Arrays.asList("egg"),
                2
        );

        RecipeResponse expectedResponse = new RecipeResponse();
        expectedResponse.setLanguageDetected("en");
        expectedResponse.setEnglishTranscript("Add eggs and milk.");
        expectedResponse.setIngredients(Arrays.asList(
                new com.cook2cart.ai_service.dto.Ingredient("egg", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("milk", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("milk", 1.0, "cup", false, "ocr", 0.90),
                new com.cook2cart.ai_service.dto.Ingredient("egg", null, null, false, "vision", 0.85)
        ));
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

        ResponseEntity<RecipeResponse> responseEntity = recipeController.combineIngredients(request);
        assertNotNull(responseEntity);
        assertEquals(200, responseEntity.getStatusCode().value());
        
        RecipeResponse response = responseEntity.getBody();
        assertNotNull(response);
        
        List<com.cook2cart.ai_service.dto.Ingredient> ingredients = response.getIngredients();
        assertNotNull(ingredients);
        assertEquals(2, ingredients.size());
    }

    @Test
    void testSynonymTranslationAndVarietyDetection() throws Exception {
        CombineSourcesRequest request = new CombineSourcesRequest(
                "Use vendakkai and kathirikai.",
                "Add small onion and natuthakali.",
                Arrays.asList("Thayir", "kothamalli"),
                2
        );

        RecipeResponse expectedResponse = new RecipeResponse();
        expectedResponse.setLanguageDetected("en");
        expectedResponse.setEnglishTranscript("Use vendakkai and kathirikai.");
        expectedResponse.setIngredients(Arrays.asList(
                new com.cook2cart.ai_service.dto.Ingredient("vendakkai", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("kathirikai", null, null, false, "speech", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("small onion", null, null, false, "ocr", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("natuthakali", null, null, false, "ocr", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("Thayir", null, null, false, "vision", 0.95),
                new com.cook2cart.ai_service.dto.Ingredient("kothamalli", null, null, false, "vision", 0.95)
        ));
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

        RecipeResponse response = recipeService.combineIngredients(request);
        assertNotNull(response);
        
        List<com.cook2cart.ai_service.dto.Ingredient> ingredients = response.getIngredients();
        assertNotNull(ingredients);
        assertEquals(6, ingredients.size());
        
        // Assertions for synonyms/translations
        assertTrue(ingredients.stream().anyMatch(i -> "lady finger".equals(i.getName())));
        assertTrue(ingredients.stream().anyMatch(i -> "brinjal".equals(i.getName())));
        assertTrue(ingredients.stream().anyMatch(i -> "curd".equals(i.getName())));
        assertTrue(ingredients.stream().anyMatch(i -> "coriander leaves".equals(i.getName())));
        
        // Assertions for varieties
        assertTrue(ingredients.stream().anyMatch(i -> "small onion".equals(i.getName())));
        assertTrue(ingredients.stream().anyMatch(i -> "nattu tomato".equals(i.getName())));
    }

    @Test
    void testParseIngredients_NoInjectsEssentials() throws Exception {
        com.cook2cart.ai_service.dto.Ingredient egg = new com.cook2cart.ai_service.dto.Ingredient("egg", 2.0, "pcs", false, "speech", 0.95);
        List<com.cook2cart.ai_service.dto.Ingredient> input = Arrays.asList(egg);

        List<com.cook2cart.ai_service.dto.Ingredient> expectedResponse = Arrays.asList(
                new com.cook2cart.ai_service.dto.Ingredient("egg", 2.0, "pcs", false, "speech", 0.95)
        );
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

        List<com.cook2cart.ai_service.dto.Ingredient> result = recipeService.parseIngredients(input, 3);
        assertNotNull(result);
        // Only the exact ingredient generated by the AI should be returned.
        assertEquals(1, result.size());

        // Verify egg properties
        com.cook2cart.ai_service.dto.Ingredient eggRes = result.stream()
                .filter(i -> "egg".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(eggRes);

        // Verify salt and oil are NOT present
        boolean hasSalt = result.stream().anyMatch(i -> "salt".equals(i.getName()));
        boolean hasOil = result.stream().anyMatch(i -> "oil".equals(i.getName()));
        assertFalse(hasSalt);
        assertFalse(hasOil);
    }

    @Test
    void testParseIngredients_DeduplicatesDuplicates() throws Exception {
        com.cook2cart.ai_service.dto.Ingredient salt1 = new com.cook2cart.ai_service.dto.Ingredient(
            "salt", 1.0, "tablespoon", 1.0, "g", true, "speech", 0.8
        );
        com.cook2cart.ai_service.dto.Ingredient salt2 = new com.cook2cart.ai_service.dto.Ingredient(
            "salt", 0.5, "teaspoon", 3.0, "g", true, "speech", 0.8
        );
        com.cook2cart.ai_service.dto.Ingredient flour = new com.cook2cart.ai_service.dto.Ingredient(
            "all-purpose flour", 1.5, "cup", 180.0, "g", false, "speech", 0.95
        );
        
        List<com.cook2cart.ai_service.dto.Ingredient> input = Arrays.asList(salt1, salt2, flour);

        List<com.cook2cart.ai_service.dto.Ingredient> expectedResponse = Arrays.asList(
                new com.cook2cart.ai_service.dto.Ingredient("salt", 1.0, "tablespoon", 1.0, "g", true, "speech", 0.8),
                new com.cook2cart.ai_service.dto.Ingredient("salt", 0.5, "teaspoon", 3.0, "g", true, "speech", 0.8),
                new com.cook2cart.ai_service.dto.Ingredient("all-purpose flour", 1.5, "cup", 180.0, "g", false, "speech", 0.95)
        );
        String mockResponseJson = createGeminiResponseJson(expectedResponse);
        
        Mockito.when(restTemplate.postForEntity(
                Mockito.anyString(),
                Mockito.any(HttpEntity.class),
                Mockito.eq(String.class)
        )).thenReturn(new ResponseEntity<>(mockResponseJson, HttpStatus.OK));

        List<com.cook2cart.ai_service.dto.Ingredient> result = recipeService.parseIngredients(input, 2);
        
        assertNotNull(result);
        // Should contain salt (merged), all-purpose flour
        assertEquals(2, result.size());
        
        // Find merged salt
        com.cook2cart.ai_service.dto.Ingredient salt = result.stream()
                .filter(i -> "salt".equals(i.getName()))
                .findFirst().orElse(null);
        assertNotNull(salt);
        // 1.0 tablespoon + 0.5 teaspoon = 1.17 tablespoon
        assertEquals(1.17, salt.getRecipeQuantity());
        assertEquals("tablespoon", salt.getRecipeUnit());
        
        // metric quantity: 1.0g + 3.0g = 4.0g
        assertEquals(4.0, salt.getQuantity());
        assertEquals("g", salt.getUnit());
        
        assertTrue(salt.isEstimated());
        assertEquals(0.96, salt.getConfidence()); // 1 - 0.2 * 0.2 = 0.96
    }
}
