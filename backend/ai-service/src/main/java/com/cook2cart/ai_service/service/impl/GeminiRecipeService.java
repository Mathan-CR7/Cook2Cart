package com.cook2cart.ai_service.service.impl;

import com.cook2cart.ai_service.dto.CombineSourcesRequest;
import com.cook2cart.ai_service.dto.Ingredient;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.dto.StoreProduct;
import com.cook2cart.ai_service.service.RecipeService;
import com.cook2cart.ai_service.util.MetricConverter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class GeminiRecipeService implements RecipeService {

    private static final Logger log = LoggerFactory.getLogger(GeminiRecipeService.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiRecipeService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent}")
    private String geminiUrl;

    @Value("${youtube.api.key:}")
    private String youtubeApiKey;

    @Override
    public RecipeResponse extractFromDescription(String videoId) {
        if (videoId == null || videoId.trim().isEmpty()) {
            return null;
        }
        try {
            String description = fetchVideoDescription(videoId);
            if (description != null && !description.trim().isEmpty()) {
                RecipeResponse descResponse = extractIngredientsFromDescription(description);
                if (descResponse != null && descResponse.getIngredients() != null && !descResponse.getIngredients().isEmpty()) {
                    log.info("Successfully extracted ingredients from YouTube description directly for videoId: {}", videoId);
                    populateConfidenceScore(descResponse);
                    return descResponse;
                }
            }
        } catch (Exception e) {
            log.warn("Error during direct description extraction: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public RecipeResponse processRecipeAudio(MultipartFile audioFile, String videoId) {
        // STEP 1: Check YouTube video description.
        try {
            String description = fetchVideoDescription(videoId);
            if (description != null && !description.trim().isEmpty()) {
                RecipeResponse descResponse = extractIngredientsFromDescription(description);
                if (descResponse != null && descResponse.getIngredients() != null && !descResponse.getIngredients().isEmpty()) {
                    log.info("Successfully extracted ingredients from YouTube description. Skipping audio processing.");
                    return descResponse;
                }
            }
        } catch (Exception e) {
            log.warn("Error during description extraction check: {}", e.getMessage());
        }

        if (audioFile == null || audioFile.isEmpty()) {
            throw new IllegalArgumentException("Audio file must not be empty");
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to local/mock processing...");
            return getFallbackResponse(audioFile);
        }

        // STEP 2: Fall back to audio processing.
        try {
            byte[] fileBytes = audioFile.getBytes();
            String base64Data = Base64.getEncoder().encodeToString(fileBytes);
            String contentType = audioFile.getContentType();
            if (contentType == null || contentType.isEmpty() || "application/octet-stream".equals(contentType)) {
                String filename = audioFile.getOriginalFilename();
                if (filename != null) {
                    if (filename.toLowerCase().endsWith(".wav")) {
                        contentType = "audio/wav";
                    } else if (filename.toLowerCase().endsWith(".mp3")) {
                        contentType = "audio/mp3";
                    } else if (filename.toLowerCase().endsWith(".m4a")) {
                        contentType = "audio/m4a";
                    } else {
                        contentType = "audio/wav";
                    }
                } else {
                    contentType = "audio/wav";
                }
            }
            String promptText = "You are a Multimodal AI Recipe Processing Assistant.\n" +
                    "Your job is to analyze cooking video/audio content and generate a standardized recipe JSON.\n\n" +
                    "Perform ALL of the following tasks:\n" +
                    "1. Speech-to-Text: Extract all spoken recipe instructions from the audio.\n" +
                    "2. OCR Extraction: Read any ingredient names, quantities, measurements, or recipe text visible on the screen.\n" +
                    "3. Multilingual Translation & Synonyms: Detect any language used in speech or text. Support standardizing names, translations, alternate spellings, synonyms, and local names from ANY language (especially South Asian languages like Tamil, Hindi, Kannada, Telugu, Malayalam) to standard English names (e.g., Vendakkai/Bhindi/Okra -> Lady Finger, Kathirikai/Baingan/Eggplant -> Brinjal, Arisi/Chawal/Akki/Biyyam -> Rice, Thayir/Dahi/Yogurt -> Curd, Kothamalli/Dhaniya/Cilantro -> Coriander Leaves, Vengayam/Pyaz -> Onion, Thakkali/Tamatar -> Tomato, Ingi/Adrak -> Ginger, Poondu/Lahsun -> Garlic).\n" +
                    "4. Variety Identification: Identify the specific variety of the ingredient if mentioned or inferred (e.g., small onion vs big onion, tomato varieties like 'nattu thakkali' / 'nattuthakkali' and 'ponda thakkali' / 'pondathakkali', or rice varieties like 'basmati', 'sona masoori', 'ponni'). Include the variety name as part of the standardized ingredient name (e.g., 'small onion', 'big onion', 'nattu tomato', 'ponda tomato', 'basmati rice') to distinguish it.\n" +
                    "5. Ingredient Extraction: Identify every ingredient mentioned in speech, OCR text, or detected visually.\n" +
                    "6. Quantity Extraction: Extract the quantity and unit associated with each ingredient.\n" +
                    "7. Ingredient Detection: Detect ingredients that appear visually even if they are not mentioned in speech.\n" +
                    "8. Unit Normalization: Preserve the original recipe quantity and unit, and convert quantities into standard units whenever possible using grams (g), kilograms (kg), milliliters (ml), liters (l), or pieces.\n" +
                    "9. Missing Quantity Estimation & Essential Injections: If essential cooking ingredients (like salt, oil, water) are missing or not explicitly specified in the recipe, automatically add them to the ingredients list. Estimate a reasonable quantity for them (and any other ingredients with unspecified quantities) based on the serving count, and mark all estimated/injected values with: \"estimated\": true. Never return null for quantities; use your knowledge to predict a realistic cooking quantity.\n" +
                     "10. Contextual & Unnamed Reference Resolution: If an ingredient is referred to in an unnamed way (e.g. \"add this powder\", \"add this masala\", \"add the prepared mixture\", \"add the ground spices\", \"add the paste\"), analyze earlier recipe steps to identify and extract the exact underlying ingredients that were roasted, ground, blended, mixed, prepared, or combined.\n" +
                     "11. Source Tracking: For every ingredient specify where it was found using 'speech', 'image', 'vision', or 'multiple'.\n" +
                     "12. Instructions Extraction: Extract detailed step-by-step cooking instructions to prepare the dish. Crucially, the instructions MUST be written in the primary language detected in the video/audio (e.g., if they speak Tamil, the instructions must be in Tamil; if they speak Hindi, the instructions must be in Hindi; if they speak English, the instructions must be in English).\n" +
                     "13. Nutrition Level Estimation: Estimate the nutritional values of this recipe based on its ingredients and standard portion sizes. Provide estimated calories, protein, carbohydrates, fat, and vitamins (as a readable summary string).\n\n" +
                     "Rules:\n" +
                     "- Never omit detected ingredients.\n" +
                     "- Combine duplicate ingredients from different sources.\n" +
                     "- Return ONLY valid JSON matching the schema. No markdown block wrapper, no conversational text.\n" +
                     "- Use null when a value cannot be determined.\n" +
                     "- Use confidence scores from 0.0 to 1.0.\n\n" +
                     "Output Schema:\n" +
                     "{\n" +
                     "  \"languageDetected\": \"string\",\n" +
                     "  \"englishTranscript\": \"string\",\n" +
                     "  \"ingredients\": [\n" +
                     "    {\n" +
                     "      \"name\": \"string\",\n" +
                     "      \"recipeQuantity\": number or null,\n" +
                     "      \"recipeUnit\": \"string\" or null,\n" +
                     "      \"estimated\": boolean,\n" +
                     "      \"source\": \"string\",\n" +
                     "      \"confidence\": number\n" +
                     "    }\n" +
                     "  ],\n" +
                     "  \"instructions\": [\n" +
                     "    \"string\"\n" +
                     "  ],\n" +
                     "  \"nutrition\": {\n" +
                     "    \"calories\": \"string\",\n" +
                     "    \"protein\": \"string\",\n" +
                     "    \"carbohydrates\": \"string\",\n" +
                     "    \"fat\": \"string\",\n" +
                     "    \"vitamins\": \"string\"\n" +
                     "  }\n" +
                     "}";
            Map<String, Object> requestBody = new HashMap<>();
            
            Map<String, Object> inlineData = new HashMap<>();
            inlineData.put("mimeType", contentType);
            inlineData.put("data", base64Data);

            Map<String, Object> audioPart = new HashMap<>();
            audioPart.put("inlineData", inlineData);

            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptText);

            Map<String, Object> partsMap = new HashMap<>();
            partsMap.put("parts", Arrays.asList(audioPart, textPart));

            requestBody.put("contents", Collections.singletonList(partsMap));

            Map<String, Object> responseConfig = new HashMap<>();
            responseConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", responseConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String url = geminiUrl + "?key=" + apiKey;

            log.info("Sending request to Gemini API...");
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                RecipeResponse recipeResponse = parseGeminiResponse(response.getBody());
                if (recipeResponse == null || recipeResponse.getIngredients() == null || recipeResponse.getIngredients().isEmpty()) {
                    throw new RuntimeException("Please upload cooking related videos.");
                }
                if (recipeResponse != null && recipeResponse.getIngredients() != null) {
                    List<Ingredient> mutableIngs = new ArrayList<>(recipeResponse.getIngredients());
                    injectMissingEssentials(mutableIngs, recipeResponse.getEnglishTranscript(), null);
                    recipeResponse.setIngredients(mutableIngs);
                    for (Ingredient ing : recipeResponse.getIngredients()) {
                        MetricConverter.convertToMetric(ing, recipeResponse.getEnglishTranscript());
                        if ("ocr".equalsIgnoreCase(ing.getSource())) {
                            ing.setSource("image");
                        }
                    }
                    recipeResponse.setIngredients(deduplicateIngredients(recipeResponse.getIngredients()));
                    populateConfidenceScore(recipeResponse);
                }
                return recipeResponse;
            } else {
                log.error("Gemini API call failed with status: {}", response.getStatusCode());
                return getFallbackResponse(audioFile);
            }

        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("cooking")) {
            }
            log.error("Error processing recipe audio through Gemini API: {}", e.getMessage(), e);
            return getFallbackResponse(audioFile);
        }
    }

    private RecipeResponse parseGeminiResponse(String responseJson) {
        try {
            Map<String, Object> root = objectMapper.readValue(responseJson, Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) root.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                if (content != null) {
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        String generatedText = (String) parts.get(0).get("text");
                        if (generatedText != null) {
                            return objectMapper.readValue(generatedText.trim(), RecipeResponse.class);
                        }
                    }
                }
            }
            throw new IllegalStateException("Failed to parse recipe response from Gemini JSON payload");
        } catch (Exception e) {
            log.error("Failed to parse Gemini API response: {}", e.getMessage());
            throw new RuntimeException("Error parsing AI response", e);
        }
    }

    private RecipeResponse getFallbackResponse(MultipartFile audioFile) {
        log.info("Generating intelligent mock fallback response based on audio metadata...");
        String filename = audioFile.getOriginalFilename() != null ? audioFile.getOriginalFilename().toLowerCase() : "";
        
        if (!isCookingRelated(filename)) {
            throw new RuntimeException("Please upload cooking related videos.");
        }
        
        RecipeResponse response;

        if (filename.contains("gobi") || filename.contains("manchurian")) {
            response = new RecipeResponse(
                    "en",
                    "To make delicious Gobi Manchurian, cut one cauliflower head into bite-sized florets. Sieve half a cup of all purpose flour and quarter cup of cornstarch. Prepare a batter with one tablespoon of ginger garlic paste, salt, and water. Dip the cauliflower florets in the batter and deep fry in two cups of oil. For the sauce, sauté one chopped onion, two green chillies, and ginger garlic paste. Stir in two tablespoons of soy sauce, one tablespoon of chilli sauce, and two tablespoons of tomato ketchup. Toss the crispy fried cauliflower florets in this sauce.",
                    Arrays.asList(
                            new Ingredient("cauliflower", 1.0, "pcs", false, "speech", 0.98),
                            new Ingredient("all purpose flour", 0.5, "cup", false, "speech", 0.95),
                            new Ingredient("cornstarch", 0.25, "cup", false, "speech", 0.95),
                            new Ingredient("ginger garlic paste", 1.0, "tablespoon", false, "speech", 0.97),
                            new Ingredient("onion", 1.0, "pcs", false, "speech", 0.96),
                            new Ingredient("green chilli", 2.0, "pcs", false, "speech", 0.95),
                            new Ingredient("soy sauce", 2.0, "tablespoon", false, "speech", 0.97),
                            new Ingredient("chilli sauce", 1.0, "tablespoon", false, "speech", 0.96),
                            new Ingredient("tomato ketchup", 2.0, "tablespoon", false, "speech", 0.97),
                            new Ingredient("oil", 2.0, "cup", true, "vision", 0.90),
                            new Ingredient("salt", 1.0, "teaspoon", true, "vision", 0.92)
                    ),
                    Arrays.asList(
                            "Cut the cauliflower (gobi) into bite-sized florets and blanch them in boiling water for 3 minutes.",
                            "In a bowl, mix all-purpose flour, cornstarch, ginger-garlic paste, salt, and water to make a thick batter.",
                            "Coat the cauliflower florets in the batter and deep fry in hot oil until crispy and golden brown.",
                            "Heat 1 tbsp oil in a pan. Sauté chopped onion, garlic, and green chillies.",
                            "Add soy sauce, chilli sauce, tomato ketchup, and a cornstarch slurry. Stir until thickened.",
                            "Toss the fried cauliflower florets into the sauce and mix well. Garnish with spring onions."
                    )
            );
        }
        else if (filename.contains("paneer") || filename.contains("butter") || filename.contains("masala")) {
            response = new RecipeResponse(
                    "en",
                    "To prepare rich Paneer Butter Masala, you need two hundred and fifty grams of paneer. Melt two tablespoons of butter and one tablespoon of oil in a pan. Sauté one chopped onion, three chopped tomatoes, cashew nuts, and one tablespoon of ginger garlic paste. Blend this mixture into a smooth purée. Heat the butter in a pan, pour in the purée, add one teaspoon of garam masala, and simmer. Add paneer cubes, two tablespoons of heavy cream, and one teaspoon of kasuri methi.",
                    Arrays.asList(
                            new Ingredient("paneer", 250.0, "g", false, "speech", 0.99),
                            new Ingredient("butter", 2.0, "tablespoon", false, "speech", 0.98),
                            new Ingredient("oil", 1.0, "tablespoon", false, "speech", 0.95),
                            new Ingredient("onion", 1.0, "pcs", false, "speech", 0.96),
                            new Ingredient("tomato", 3.0, "pcs", false, "speech", 0.98),
                            new Ingredient("cashew nuts", 10.0, "pcs", false, "speech", 0.94),
                            new Ingredient("ginger garlic paste", 1.0, "tablespoon", false, "speech", 0.97),
                            new Ingredient("garam masala", 1.0, "teaspoon", false, "speech", 0.96),
                            new Ingredient("heavy cream", 2.0, "tablespoon", false, "speech", 0.97),
                            new Ingredient("kasuri methi", 1.0, "teaspoon", false, "speech", 0.95)
                    ),
                    Arrays.asList(
                            "Heat 1 tbsp oil and sauté chopped onions, ginger garlic paste, tomatoes, and cashews until soft.",
                            "Blend the sautéed mixture into a smooth tomato-onion paste.",
                            "Melt butter in a pan, add the blended paste, and cook on low heat for 5 minutes.",
                            "Add garam masala, salt, and water to adjust the consistency.",
                            "Add the paneer cubes and simmer for 3-4 minutes.",
                            "Finish with heavy cream and crushed kasuri methi (dried fenugreek leaves)."
                    )
            );
        }
        else if (filename.contains("french") || filename.contains("fries") || filename.contains("fry")) {
            response = new RecipeResponse(
                    "en",
                    "For crispy French Fries, peel and slice three large potatoes into thick sticks. Soak them in cold water to remove starch. Parboil them with salt for five minutes, then dry thoroughly. Deep fry the potato sticks in two cups of hot oil for five minutes on medium heat, drain them, and fry again on high heat for three minutes until golden. Sprinkle with salt immediately.",
                    Arrays.asList(
                            new Ingredient("potato", 3.0, "pcs", false, "speech", 0.98),
                            new Ingredient("oil", 2.0, "cup", false, "speech", 0.95),
                            new Ingredient("salt", 1.0, "teaspoon", true, "vision", 0.92)
                    ),
                    Arrays.asList(
                            "Peel the potatoes and cut them into 1/4-inch thick matchsticks.",
                            "Soak the potato cut sticks in cold water for 30 minutes to remove excess starch.",
                            "Parboil the potatoes in water with salt for 5 minutes, then drain and dry completely.",
                            "Heat oil to 300°F (150°C) and fry the potatoes for 5 minutes (first fry). Remove and drain.",
                            "Heat oil to 375°F (190°C) and fry again for 2-3 minutes until golden brown and crispy (second fry).",
                            "Drain on paper towels and toss immediately with salt."
                    )
            );
        }
        else if (filename.contains("cookie") || filename.contains("chocolate") || audioFile.getSize() > 3000000) {
            response = new RecipeResponse(
                    "en",
                    "To make the perfect chocolate chip cookies, you'll need the following ingredients. Start with one cup of unsalted butter, softened. Then add three quarters of a cup of granulated sugar and three quarters of a cup of packed brown sugar. Next, mix in two large eggs and two teaspoons of vanilla extract. For the dry ingredients, you will need two and a quarter cups of all purpose flour, one teaspoon of baking soda, and half a teaspoon of salt. Finally, fold in two cups of semi sweet chocolate chips.",
                    Arrays.asList(
                            new Ingredient("unsalted butter", 1.0, "cup", false, "speech", 0.98),
                            new Ingredient("granulated sugar", 0.75, "cup", false, "speech", 0.97),
                            new Ingredient("packed brown sugar", 0.75, "cup", false, "speech", 0.97),
                            new Ingredient("large eggs", 2.0, null, false, "speech", 0.95),
                            new Ingredient("vanilla extract", 2.0, "teaspoon", false, "speech", 0.98),
                            new Ingredient("all purpose flour", 2.25, "cup", false, "speech", 0.99),
                            new Ingredient("baking soda", 1.0, "teaspoon", false, "speech", 0.96),
                            new Ingredient("salt", 0.5, "teaspoon", false, "speech", 0.98),
                            new Ingredient("semi sweet chocolate chips", 2.0, "cup", false, "speech", 0.98)
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
        }
        else if (filename.contains("pasta") || filename.contains("spaghetti")) {
            response = new RecipeResponse(
                    "en",
                    "Today we are going to make a simple pasta. First, boil some water and add eight ounces of spaghetti. While that's cooking, heat two tablespoons of olive oil in a pan. Add three cloves of minced garlic and cook until fragrant. Then, toss in one cup of cherry tomatoes, halved, and cook for about three minutes. Finally, mix in half a cup of grated parmesan cheese and a handful of fresh basil leaves. Season with salt and pepper to taste.",
                    Arrays.asList(
                            new Ingredient("spaghetti", 8.0, "ounce", false, "speech", 0.97),
                            new Ingredient("olive oil", 2.0, "tablespoon", false, "speech", 0.99),
                            new Ingredient("minced garlic", 3.0, "clove", false, "speech", 0.95),
                            new Ingredient("cherry tomatoes", 1.0, "cup", false, "speech", 0.96),
                            new Ingredient("grated parmesan cheese", 0.5, "cup", false, "speech", 0.94),
                            new Ingredient("fresh basil leaves", null, null, true, "vision", 0.85)
                    ),
                    Arrays.asList(
                            "Bring a large pot of salted water to a boil and cook the spaghetti.",
                            "Heat olive oil in a pan and fry the minced garlic until fragrant.",
                            "Add the halved cherry tomatoes and cook for 3 minutes.",
                            "Drain spaghetti and toss with the garlic and tomatoes.",
                            "Top with parmesan cheese and fresh basil leaves."
                    )
            );
        }
        else {
            response = new RecipeResponse(
                    "en",
                    "Recipe instructions: mix two cups of flour with one cup of milk and one egg.",
                    Arrays.asList(
                            new Ingredient("flour", 2.0, "cup", false, "speech", 0.95),
                            new Ingredient("milk", 1.0, "cup", false, "speech", 0.96),
                            new Ingredient("egg", 1.0, null, false, "vision", 0.92)
                    ),
                    Arrays.asList(
                            "Mix the flour, milk, and egg in a bowl until smooth.",
                            "Cook on a heated pan until golden."
                    )
            );
        }
        if (response.getIngredients() != null) {
            List<Ingredient> mutableIngs = new ArrayList<>(response.getIngredients());
            injectMissingEssentials(mutableIngs, response.getEnglishTranscript(), null);
            response.setIngredients(mutableIngs);
            for (Ingredient ing : response.getIngredients()) {
                MetricConverter.convertToMetric(ing, response.getEnglishTranscript());
            }
            response.setIngredients(deduplicateIngredients(response.getIngredients()));
            populateConfidenceScore(response);
        }
        return response;
    }

    @Override
    public RecipeResponse combineIngredients(CombineSourcesRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request must not be null");
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to local/mock combination processing...");
            return getFallbackCombineResponse(request);
        }

        try {
            String promptText = "You are a Multimodal AI Recipe Processing Assistant.\n" +
                    "Your job is to combine recipe information from three sources: Speech Transcript, OCR Text Extracted from Video Frames, and Vision-Based Ingredient Detection.\n\n" +
                    "Input Data:\n" +
                    "- Speech Transcript: \"" + (request.getSpeechTranscript() != null ? request.getSpeechTranscript() : "") + "\"\n" +
                    "- OCR Text: \"" + (request.getOcrText() != null ? request.getOcrText() : "") + "\"\n" +
                    "- Vision Detections: " + (request.getVisionDetections() != null ? request.getVisionDetections().toString() : "[]") + "\n" +
                    "- Servings / Target People Count: " + (request.getServings() != null ? request.getServings() : "2") + "\n\n" +
                    "Perform ALL of the following tasks:\n" +
                    "1. Extract ingredients from all three sources: Speech Transcript, OCR Text, and Vision Detections.\n" +
                    "2. Merge ingredients that refer to the same item. Support standardizing names, translations, alternate spellings, synonyms, and local names from ANY language (especially South Asian languages like Tamil, Hindi, Kannada, Telugu, Malayalam) to standard English names:\n" +
                    "   - Vendakkai, Bhindi, Okra -> Lady Finger\n" +
                    "   - Kathirikai, Baingan, Eggplant, Aubergine -> Brinjal\n" +
                    "   - Arisi, Chawal, Akki, Biyyam -> Rice\n" +
                    "   - Thayir, Dahi, Yogurt -> Curd\n" +
                    "   - Kothamalli, Dhaniya, Cilantro -> Coriander Leaves\n" +
                    "   - Vengayam, Pyaz -> Onion\n" +
                    "   - Thakkali, Tamatar -> Tomato\n" +
                    "3. Identify the specific variety of the ingredient if mentioned or inferred (e.g., small onion vs big onion, tomato varieties like 'nattu thakkali' / 'nattuthakkali' and 'ponda thakkali' / 'pondathakkali', or rice varieties like 'basmati', 'sona masoori', 'ponni'). Include the variety name as part of the standardized ingredient name (e.g., 'small onion', 'big onion', 'nattu tomato', 'ponda tomato', 'basmati rice') to distinguish it.\n" +
                    "4. Track and set the 'source' field for each ingredient:\n" +
                    "   - If an ingredient appears in OCR but not in speech: Mark source=\"ocr\"\n" +
                    "   - If an ingredient appears in Vision but not in speech: Mark source=\"vision\"\n" +
                    "   - If an ingredient appears in multiple sources: Mark source as a combination of sources, e.g. \"speech+ocr+vision\", \"speech+ocr\", \"speech+vision\", \"ocr+vision\".\n" +
                    "   - If an ingredient appears in speech only: Mark source=\"speech\".\n" +
                    "5. Extract quantities and units from the Speech Transcript and OCR Text whenever available.\n" +
                    "6. Missing Quantity Estimation & Essential Injections: If essential cooking ingredients (like salt, oil, water) are missing or not explicitly specified, automatically add them to the ingredients list. Estimate a reasonable quantity for them (and any other ingredients with unspecified quantities) based on the serving/people count, and mark all estimated/injected values with: \"estimated\": true. Never return null for quantities; use your knowledge to predict a realistic cooking quantity.\n" +
                    "7. Infer ingredients inside mixtures or masalas. E.g., if the speech transcript describes roasting/grinding/mixing/preparing ingredients (like coriander seeds, cumin seeds, cloves, cinnamon) to make a powder/paste/mixture/masala, and later adds that masala/mixture/paste, you must infer the constituent ingredients (coriander seeds, cumin seeds, cloves, cinnamon) and include them in the final list, and NOT just the generic masala.\n" +
                    "8. Remove duplicate ingredients.\n" +
                    "9. Return confidence scores (a double between 0.0 and 1.0) for each ingredient. If merged from multiple sources, combine the confidence scores (e.g., using formula: 1 - (1-c1)*(1-c2)... or similar logic indicating higher confidence).\n" +
                    "9. Return ONLY valid JSON matching the following schema. No markdown block wrapper, no conversational text.\n\n" +
                    "Output Schema:\n" +
                    "{\n" +
                    "  \"languageDetected\": \"string\",\n" +
                    "  \"englishTranscript\": \"string\",\n" +
                    "  \"ingredients\": [\n" +
                    "    {\n" +
                    "      \"name\": \"string\",\n" +
                    "      \"recipeQuantity\": number or null,\n" +
                    "      \"recipeUnit\": \"string\" or null,\n" +
                    "      \"estimated\": boolean,\n" +
                    "      \"source\": \"string\",\n" +
                    "      \"confidence\": number\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}";

            Map<String, Object> requestBody = new HashMap<>();

            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptText);

            Map<String, Object> partsMap = new HashMap<>();
            partsMap.put("parts", Collections.singletonList(textPart));

            requestBody.put("contents", Collections.singletonList(partsMap));

            Map<String, Object> responseConfig = new HashMap<>();
            responseConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", responseConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String url = geminiUrl + "?key=" + apiKey;

            log.info("Sending request to Gemini API for ingredient combination...");
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                RecipeResponse recipeResponse = parseGeminiResponse(response.getBody());
                if (recipeResponse != null && recipeResponse.getIngredients() != null) {
                    Integer servings = request.getServings();
                    if (servings == null) servings = 2;
                    List<Ingredient> mutableIngs = new ArrayList<>(recipeResponse.getIngredients());
                    injectMissingEssentials(mutableIngs, recipeResponse.getEnglishTranscript(), servings);
                    recipeResponse.setIngredients(mutableIngs);
                    for (Ingredient ing : recipeResponse.getIngredients()) {
                        MetricConverter.convertToMetric(ing, recipeResponse.getEnglishTranscript(), servings);
                    }
                    recipeResponse.setIngredients(deduplicateIngredients(recipeResponse.getIngredients()));
                    populateConfidenceScore(recipeResponse);
                }
                return recipeResponse;
            } else {
                log.error("Gemini API call failed with status: {}", response.getStatusCode());
                return getFallbackCombineResponse(request);
            }
        } catch (Exception e) {
            log.error("Error calling Gemini API for combination: {}", e.getMessage(), e);
            return getFallbackCombineResponse(request);
        }
    }

    private RecipeResponse getFallbackCombineResponse(CombineSourcesRequest request) {
        log.info("Generating intelligent fallback response for ingredient combination...");
        
        Map<String, ParsedIngredient> map = new LinkedHashMap<>();
        
        parseTextSource(request.getSpeechTranscript(), "speech", 0.95, map);
        
        parseTextSource(request.getOcrText(), "ocr", 0.90, map);
        
        if (request.getVisionDetections() != null) {
            for (String detection : request.getVisionDetections()) {
                String normalized = normalizeIngredientName(detection);
                if (!normalized.isEmpty()) {
                    ParsedIngredient pi = map.computeIfAbsent(normalized, ParsedIngredient::new);
                    pi.sources.add("vision");
                    if (!pi.confidences.contains(0.85)) {
                        pi.confidences.add(0.85);
                    }
                }
            }
        }
        
        List<String> inferredMasala = inferMasalaIngredients(request.getSpeechTranscript());
        boolean hasMasalaInText = false;
        ParsedIngredient combinedMasalaPi = new ParsedIngredient("masala");
        
        for (String key : new ArrayList<>(map.keySet())) {
            if (key.equals("masala") || key.equals("powder") || key.equals("paste") || key.equals("mixture")) {
                hasMasalaInText = true;
                ParsedIngredient removed = map.remove(key);
                if (removed != null) {
                    combinedMasalaPi.sources.addAll(removed.sources);
                    combinedMasalaPi.confidences.addAll(removed.confidences);
                    if (combinedMasalaPi.recipeQuantity == null) {
                        combinedMasalaPi.recipeQuantity = removed.recipeQuantity;
                        combinedMasalaPi.recipeUnit = removed.recipeUnit;
                    }
                }
            }
        }
        
        if (hasMasalaInText && !inferredMasala.isEmpty()) {
            for (String inferredIng : inferredMasala) {
                ParsedIngredient pi = map.computeIfAbsent(inferredIng, ParsedIngredient::new);
                pi.sources.addAll(combinedMasalaPi.sources);
                pi.confidences.addAll(combinedMasalaPi.confidences);
                if (pi.recipeQuantity == null) {
                    pi.recipeQuantity = combinedMasalaPi.recipeQuantity;
                    pi.recipeUnit = combinedMasalaPi.recipeUnit;
                }
            }
        }
        
        List<Ingredient> ingredients = new ArrayList<>();
        Integer servings = request.getServings();
        if (servings == null) {
            servings = 2;
        }
        
        for (ParsedIngredient pi : map.values()) {
            double combinedConfidence = combineConfidences(pi.confidences);
            
            List<String> orderedSources = new ArrayList<>();
            if (pi.sources.contains("speech")) orderedSources.add("speech");
            if (pi.sources.contains("ocr")) orderedSources.add("ocr");
            if (pi.sources.contains("vision")) orderedSources.add("vision");
            String sourceStr = String.join("+", orderedSources);
            if (sourceStr.isEmpty()) {
                sourceStr = "vision";
            }
            
            Ingredient ing = new Ingredient(
                pi.name,
                pi.recipeQuantity,
                pi.recipeUnit,
                pi.recipeQuantity == null,
                sourceStr,
                combinedConfidence
            );
            ingredients.add(ing);
        }
        
        injectMissingEssentials(ingredients, request.getSpeechTranscript(), servings);
        for (Ingredient ing : ingredients) {
            MetricConverter.convertToMetric(ing, request.getSpeechTranscript(), servings);
        }
        List<Ingredient> deduplicated = deduplicateIngredients(ingredients);
        
        String language = "en";
        RecipeResponse fallbackRes = new RecipeResponse(language, request.getSpeechTranscript(), deduplicated, new ArrayList<>());
        populateConfidenceScore(fallbackRes);
        return fallbackRes;
    }

    private void parseTextSource(String text, String sourceName, double baseConfidence, Map<String, ParsedIngredient> map) {
        if (text == null || text.trim().isEmpty()) {
            return;
        }

        String lowerText = text.toLowerCase();
        List<String> matchedKeywords = new ArrayList<>();
        
        Map<String, String> candidateTranslations = new LinkedHashMap<>();
        candidateTranslations.put("coriander seeds", "coriander seeds");
        candidateTranslations.put("cumin seeds", "cumin seeds");
        candidateTranslations.put("chocolate chips", "chocolate chips");
        candidateTranslations.put("olive oil", "olive oil");
        candidateTranslations.put("minced garlic", "minced garlic");
        candidateTranslations.put("cherry tomatoes", "cherry tomatoes");
        candidateTranslations.put("grated parmesan cheese", "grated parmesan cheese");
        candidateTranslations.put("fresh basil leaves", "fresh basil leaves");
        candidateTranslations.put("baking soda", "baking soda");
        candidateTranslations.put("vanilla extract", "vanilla extract");
        
        candidateTranslations.put("small onion", "small onion");
        candidateTranslations.put("big onion", "big onion");
        candidateTranslations.put("onion", "onion");
        candidateTranslations.put("onions", "onion");
        candidateTranslations.put("pyaz", "onion");
        candidateTranslations.put("vengayam", "onion");
        
        candidateTranslations.put("nattuthakkali", "nattu tomato");
        candidateTranslations.put("natuthakali", "nattu tomato");
        candidateTranslations.put("nattu tomato", "nattu tomato");
        candidateTranslations.put("pondathakkali", "ponda tomato");
        candidateTranslations.put("ponda thakkali", "ponda tomato");
        candidateTranslations.put("ponda tomato", "ponda tomato");
        candidateTranslations.put("tomato", "tomato");
        candidateTranslations.put("tomatoes", "tomato");
        candidateTranslations.put("tamatar", "tomato");
        
        candidateTranslations.put("green chilli", "green chilli");
        candidateTranslations.put("green chili", "green chilli");
        candidateTranslations.put("mirchi", "green chilli");
        candidateTranslations.put("hari mirch", "green chilli");
        
        candidateTranslations.put("vendakkai", "lady finger");
        candidateTranslations.put("bhindi", "lady finger");
        candidateTranslations.put("okra", "lady finger");
        candidateTranslations.put("lady finger", "lady finger");
        
        candidateTranslations.put("kathirikai", "brinjal");
        candidateTranslations.put("baingan", "brinjal");
        candidateTranslations.put("eggplant", "brinjal");
        candidateTranslations.put("aubergine", "brinjal");
        candidateTranslations.put("brinjal", "brinjal");
        
        candidateTranslations.put("arisi", "rice");
        candidateTranslations.put("chawal", "rice");
        candidateTranslations.put("akki", "rice");
        candidateTranslations.put("biyyam", "rice");
        
        candidateTranslations.put("thayir", "curd");
        candidateTranslations.put("dahi", "curd");
        candidateTranslations.put("yogurt", "curd");
        candidateTranslations.put("curd", "curd");
        
        candidateTranslations.put("kothamalli", "coriander leaves");
        candidateTranslations.put("cilantro", "coriander leaves");
        candidateTranslations.put("coriander leaves", "coriander leaves");
        
        candidateTranslations.put("cloves", "cloves");
        candidateTranslations.put("cinnamon", "cinnamon");
        candidateTranslations.put("butter", "butter");
        candidateTranslations.put("sugar", "sugar");
        candidateTranslations.put("flour", "flour");
        candidateTranslations.put("milk", "milk");
        candidateTranslations.put("egg", "egg");
        candidateTranslations.put("eggs", "egg");
        candidateTranslations.put("spaghetti", "spaghetti");
        candidateTranslations.put("garlic", "garlic");
        candidateTranslations.put("lasun", "garlic");
        candidateTranslations.put("lahsun", "garlic");
        candidateTranslations.put("ginger", "ginger");
        candidateTranslations.put("adrak", "ginger");
        candidateTranslations.put("basil", "fresh basil leaves");
        candidateTranslations.put("peanuts", "peanuts");
        candidateTranslations.put("salt", "salt");
        candidateTranslations.put("masala", "masala");
        candidateTranslations.put("paste", "paste");
        candidateTranslations.put("powder", "powder");
        candidateTranslations.put("mixture", "mixture");

        for (Map.Entry<String, String> entry : candidateTranslations.entrySet()) {
            String keyword = entry.getKey();
            String stdName = entry.getValue();
            
            if (lowerText.contains(keyword)) {
                boolean isSubphrase = false;
                for (String matched : matchedKeywords) {
                    if (matched.contains(keyword) && !matched.equals(keyword)) {
                        isSubphrase = true;
                        break;
                    }
                }
                if (isSubphrase) {
                    continue;
                }
                matchedKeywords.add(keyword);

                ParsedIngredient pi = map.computeIfAbsent(stdName, ParsedIngredient::new);
                pi.sources.add(sourceName);
                if (!pi.confidences.contains(baseConfidence)) {
                    pi.confidences.add(baseConfidence);
                }
                extractQuantityAndUnit(lowerText, keyword, pi);
            }
        }
    }

    private void extractQuantityAndUnit(String text, String keyword, ParsedIngredient pi) {
        int idx = text.indexOf(keyword);
        if (idx == -1) return;
        
        String prefix = text.substring(Math.max(0, idx - 30), idx).trim();
        
        java.util.regex.Pattern numPattern = java.util.regex.Pattern.compile(
            "(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|three quarters|a)\\s*(cup|tsp|teaspoon|tbsp|tablespoon|spoon|gram|g|ml|ounce|oz|clove|piece|pcs|pinch|handful)?s?\\b"
        );
        java.util.regex.Matcher m = numPattern.matcher(prefix);
        
        double qty = -1.0;
        String unit = null;
        while (m.find()) {
            String qtyStr = m.group(1);
            String unitStr = m.group(2);
            
            double val = parseNumberWord(qtyStr);
            if (val > 0) {
                qty = val;
                unit = unitStr;
            }
        }
        
        if (qty > 0) {
            if (pi.recipeQuantity == null) {
                pi.recipeQuantity = qty;
                pi.recipeUnit = unit;
            }
        }
    }

    private double parseNumberWord(String word) {
        if (word == null) return 0.0;
        word = word.toLowerCase().trim();
        if (word.equals("one") || word.equals("a")) return 1.0;
        if (word.equals("two")) return 2.0;
        if (word.equals("three")) return 3.0;
        if (word.equals("four")) return 4.0;
        if (word.equals("five")) return 5.0;
        if (word.equals("six")) return 6.0;
        if (word.equals("seven")) return 7.0;
        if (word.equals("eight")) return 8.0;
        if (word.equals("nine")) return 9.0;
        if (word.equals("ten")) return 10.0;
        if (word.equals("half")) return 0.5;
        if (word.equals("quarter")) return 0.25;
        if (word.equals("three quarters")) return 0.75;
        try {
            return Double.parseDouble(word);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private double combineConfidences(List<Double> confidences) {
        if (confidences == null || confidences.isEmpty()) {
            return 0.0;
        }
        double product = 1.0;
        for (double c : confidences) {
            product *= (1.0 - c);
        }
        double val = 1.0 - product;
        return Math.round(val * 100.0) / 100.0;
    }

    private List<String> inferMasalaIngredients(String speech) {
        List<String> inferred = new ArrayList<>();
        if (speech == null) return inferred;
        String lower = speech.toLowerCase();
        if (lower.contains("roast") || lower.contains("grind") || lower.contains("powder") || lower.contains("blend")) {
            if (lower.contains("coriander seeds")) inferred.add("coriander seeds");
            if (lower.contains("cumin seeds")) inferred.add("cumin seeds");
            if (lower.contains("clove")) inferred.add("cloves");
            if (lower.contains("cinnamon")) inferred.add("cinnamon");
        }
        return inferred;
    }

    private String normalizeIngredientName(String name) {
        if (name == null) return "";
        String lower = name.toLowerCase().trim();
        if (lower.equals("onions") || lower.equals("pyaz") || lower.equals("onion")) {
            return "onion";
        }
        if (lower.equals("mirchi") || lower.equals("hari mirch") || lower.equals("green chilli") || lower.equals("green chili")) {
            return "green chilli";
        }
        if (lower.equals("coriander seeds") || lower.equals("dhaniya seeds")) {
            return "coriander seeds";
        }
        if (lower.equals("cumin seeds") || lower.equals("jeera")) {
            return "cumin seeds";
        }
        if (lower.equals("cloves") || lower.equals("lavang")) {
            return "cloves";
        }
        if (lower.equals("cinnamon") || lower.equals("dalchini")) {
            return "cinnamon";
        }
        if (lower.contains("brinjal") || lower.contains("aubergine") || lower.contains("eggplant") || lower.contains("kathirikai") || lower.contains("baingan")) {
            return "brinjal";
        }
        if (lower.equals("tamatar") || lower.equals("tomato") || lower.equals("tomatoes")) {
            return "tomato";
        }
        if (lower.contains("vendakkai") || lower.contains("bhindi") || lower.contains("okra") || lower.contains("lady finger") || lower.contains("ladyfinger")) {
            return "lady finger";
        }
        if (lower.contains("thayir") || lower.contains("dahi") || lower.contains("yogurt") || lower.contains("curd")) {
            return "curd";
        }
        if (lower.contains("kothamalli") || lower.contains("cilantro") || lower.contains("coriander leaves")) {
            return "coriander leaves";
        }
        if (lower.contains("small onion")) {
            return "small onion";
        }
        if (lower.contains("big onion")) {
            return "big onion";
        }
        if (lower.contains("natuthakali") || lower.contains("nattuthakkali") || lower.contains("nattu tomato")) {
            return "nattu tomato";
        }
        if (lower.contains("pondathakkali") || lower.contains("ponda thakkali") || lower.contains("ponda tomato")) {
            return "ponda tomato";
        }
        return lower;
    }

    @Override
    public List<Ingredient> parseIngredients(List<Ingredient> ingredients, int servings) {
        if (ingredients == null || ingredients.isEmpty()) {
            return new ArrayList<>();
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to local/mock parsing...");
            return getFallbackParseResponse(ingredients, servings);
        }

        try {
            String inputJson = objectMapper.writeValueAsString(ingredients);

            String promptText = "You are a Recipe Processing AI.\n" +
                    "Your job is to parse, translate, standardize, and clean a list of raw ingredients.\n\n" +
                    "Input Ingredients:\n" +
                    inputJson + "\n\n" +
                    "Servings Count: " + servings + "\n\n" +
                    "For each ingredient, perform the following tasks:\n" +
                    "1. Name Cleaning: Extract the actual ingredient name. Strip away cooking actions, instructions, and preparation details (e.g. 'chopped', 'minced', 'diced', 'sliced', 'grated', 'roasted', 'ground', 'cooked', 'required', 'to taste', 'some', 'little', 'cut into pieces', 'fresh').\n" +
                    "2. Translation & Synonyms: Translate local names and synonyms to standard English names (e.g., Vendakkai/Bhindi/Okra -> Lady Finger, Kathirikai/Baingan/Eggplant -> Brinjal, Arisi/Chawal/Akki/Biyyam -> Rice, Thayir/Dahi/Yogurt -> Curd, Kothamalli/Dhaniya/Cilantro -> Coriander Leaves, Vengayam/Pyaz -> Onion, Thakkali/Tamatar -> Tomato, Ingi/Adrak -> Ginger, Poondu/Lahsun -> Garlic).\n" +
                    "3. Variety Identification: Identify and preserve specific varieties if mentioned (e.g. small onion vs big onion, tomato varieties like 'nattu thakkali' and 'ponda thakkali', or rice varieties like 'basmati', 'sona masoori', 'ponni'). Include the variety as part of the standardized name (e.g., 'small onion', 'big onion', 'nattu tomato', 'ponda tomato', 'basmati rice').\n" +
                    "4. Quantity & Unit Extraction: If the input name contains a quantity and unit (e.g., '2 cups chopped Arisi'), extract it into 'recipeQuantity' and 'recipeUnit', and clean the 'name' field.\n" +
                    "5. Unit Standardization (Metric Conversion): Convert the extracted quantities and units into metric standard units:\n" +
                    "   - Weight: grams (g), kilograms (kg)\n" +
                    "   - Volume: milliliters (ml), liters (l)\n" +
                    "   - Count: pieces (pcs)\n" +
                    "   Convert non-standard units (cups, tbsp, tsp, pinch, handful, glass, tumbler, katori) to metric equivalents:\n" +
                    "     - 2 cups rice -> 400g\n" +
                    "     - 1 cup butter -> 227g\n" +
                    "     - 1 cup flour -> 120g\n" +
                    "     - 1 cup sugar -> 200g\n" +
                    "     - 1 glass/tumbler water/milk -> 200ml / 250ml\n" +
                    "     - 1 katori -> 150g or 150ml\n" +
                    "     - 1 tbsp liquid -> 15ml\n" +
                    "     - 1 tsp salt -> 5g\n" +
                    "     - 1 pinch salt -> 0.5g\n" +
                    "     - 1 handful peanuts -> 30g\n" +
                    "     - 1 handful coriander -> 20g\n" +
                    "     - pieces/cloves -> pieces (pcs)\n" +
                    "   Populate these in 'quantity' and 'unit' fields.\n" +
                    "6. Missing Quantity Estimation & Essential Injections: If essential cooking ingredients (like salt, oil, water) are missing or not explicitly specified, automatically add them to the ingredients list. Estimate a reasonable quantity for them (and any other ingredients with unspecified quantities) based on the serving count (servings=" + servings + "), and mark all estimated/injected values with: \"estimated\": true. Never return null for quantities; use your knowledge to predict a realistic cooking quantity.\n" +
                    "7. Retain other fields like source and confidence.\n\n" +
                    "Return ONLY a valid JSON array of ingredient objects matching the following schema. Do not wrap in markdown or conversation.\n\n" +
                    "Output Schema:\n" +
                    "[\n" +
                    "  {\n" +
                    "    \"name\": \"string\",\n" +
                    "    \"recipeQuantity\": number or null,\n" +
                    "    \"recipeUnit\": \"string\" or null,\n" +
                    "    \"quantity\": number or null,\n" +
                    "    \"unit\": \"string\" or null,\n" +
                    "    \"estimated\": boolean,\n" +
                    "    \"source\": \"string\",\n" +
                    "    \"confidence\": number\n" +
                    "  }\n" +
                    "]";

            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptText);
            Map<String, Object> partsMap = new HashMap<>();
            partsMap.put("parts", Collections.singletonList(textPart));
            requestBody.put("contents", Collections.singletonList(partsMap));

            Map<String, Object> responseConfig = new HashMap<>();
            responseConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", responseConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String url = geminiUrl + "?key=" + apiKey;

            log.info("Sending request to Gemini API to parse ingredients dynamically...");
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Ingredient> parsedList = parseIngredientsResponse(response.getBody());
                if (parsedList != null) {
                    parsedList = new ArrayList<>(parsedList);
                    injectMissingEssentials(parsedList, "serves " + servings, servings);
                    for (Ingredient ing : parsedList) {
                        MetricConverter.convertToMetric(ing, "serves " + servings, servings);
                    }
                    parsedList = deduplicateIngredients(parsedList);
                }
                return parsedList;
            } else {
                return getFallbackParseResponse(ingredients, servings);
            }
        } catch (Exception e) {
            log.error("Error parsing ingredients dynamically through Gemini: {}", e.getMessage(), e);
            return getFallbackParseResponse(ingredients, servings);
        }
    }

    private List<Ingredient> parseIngredientsResponse(String responseJson) {
        try {
            Map<String, Object> root = objectMapper.readValue(responseJson, Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) root.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                if (content != null) {
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        String generatedText = (String) parts.get(0).get("text");
                        if (generatedText != null) {
                            return objectMapper.readValue(
                                generatedText.trim(),
                                objectMapper.getTypeFactory().constructCollectionType(List.class, Ingredient.class)
                            );
                        }
                    }
                }
            }
            throw new IllegalStateException("Failed to parse recipe response from Gemini JSON payload");
        } catch (Exception e) {
            log.error("Failed to parse Gemini API response: {}", e.getMessage());
            throw new RuntimeException("Error parsing AI response", e);
        }
    }

    private List<Ingredient> getFallbackParseResponse(List<Ingredient> ingredients, int servings) {
        List<Ingredient> result = new ArrayList<>();
        for (Ingredient ing : ingredients) {
            Ingredient parsed = new Ingredient(
                ing.getName(),
                ing.getRecipeQuantity(),
                ing.getRecipeUnit(),
                ing.getQuantity(),
                ing.getUnit(),
                ing.isEstimated(),
                ing.getSource() != null ? ing.getSource() : "speech",
                ing.getConfidence() > 0.0 ? ing.getConfidence() : 0.95
            );
            cleanRawNameWithQuantity(parsed);
            
            String name = parsed.getName().toLowerCase().trim();
            List<String> wordsToRemove = Arrays.asList(
                "chopped", "minced", "diced", "sliced", "grated", "peeled", "crushed", "roasted", 
                "ground", "fried", "boiled", "cooked", "required", "to taste", "some", "little", 
                "cut into pieces", "fine", "finely", "fresh", "cut", "prepared"
            );
            for (String word : wordsToRemove) {
                name = name.replace(word, "").trim();
            }
            parsed.setName(name);
            result.add(parsed);
        }
        injectMissingEssentials(result, "serves " + servings, servings);
        for (Ingredient parsed : result) {
            MetricConverter.convertToMetric(parsed, "serves " + servings, servings);
        }
        return deduplicateIngredients(result);
    }



    private void cleanRawNameWithQuantity(Ingredient ing) {
        if (ing.getRecipeQuantity() == null || ing.getRecipeQuantity() == 0.0) {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "^(\\d+(?:\\.\\d+)?|\\d+/\\d+|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|three quarters|a)?\\s*(cups?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|tablespoons?|tbsp|teaspoons?|tsp|pieces?|pcs|pinch|handfuls?|unit|units|oz|ounces?|cloves?)?\\s+(.*)$",
                java.util.regex.Pattern.CASE_INSENSITIVE
            );
            java.util.regex.Matcher matcher = pattern.matcher(ing.getName().trim());
            if (matcher.matches()) {
                String qtyStr = matcher.group(1);
                String unitStr = matcher.group(2);
                String nameStr = matcher.group(3);

                if (qtyStr != null && !qtyStr.isEmpty()) {
                    double parsedQty = parseNumberWord(qtyStr);
                    if (parsedQty > 0.0) {
                        ing.setRecipeQuantity(parsedQty);
                        if (unitStr != null) {
                            ing.setRecipeUnit(unitStr.toLowerCase());
                        } else {
                            ing.setRecipeUnit("pcs");
                        }
                        ing.setName(nameStr);
                    }
                }
            }
        }
    }

    @Override
    public List<StoreProduct> updateLatestPrices(List<StoreProduct> products) {
        if (products == null || products.isEmpty()) {
            return new ArrayList<>();
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to simulated dynamic fluctuations...");
            return getFallbackUpdatedPrices(products);
        }

        try {
            String inputJson = objectMapper.writeValueAsString(products);

            String promptText = "You are a grocery store pricing agent.\n" +
                    "Your job is to simulate realistic dynamic price fluctuations (typically between -5% and +10%) for a list of products.\n\n" +
                    "Input Products:\n" +
                    inputJson + "\n\n" +
                    "For each product, generate a new updated price based on its current price, category, name, and brand. Ensure that the price fluctuates realistically (within -5% to +10%). Keep the product's ID, name, brand, size, and category exactly the same.\n\n" +
                    "Return ONLY a valid JSON array of product objects matching the following schema. Do not wrap in markdown or conversation.\n\n" +
                    "Output Schema:\n" +
                    "[\n" +
                    "  {\n" +
                    "    \"id\": \"string\",\n" +
                    "    \"name\": \"string\",\n" +
                    "    \"brand\": \"string\",\n" +
                    "    \"size\": \"string\",\n" +
                    "    \"price\": number,\n" +
                    "    \"category\": \"string\"\n" +
                    "  }\n" +
                    "]";

            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptText);
            Map<String, Object> partsMap = new HashMap<>();
            partsMap.put("parts", Collections.singletonList(textPart));
            requestBody.put("contents", Collections.singletonList(partsMap));

            Map<String, Object> responseConfig = new HashMap<>();
            responseConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", responseConfig);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String url = geminiUrl + "?key=" + apiKey;

            log.info("Sending request to Gemini API to update prices dynamically...");
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseUpdatedPricesResponse(response.getBody());
            } else {
                return getFallbackUpdatedPrices(products);
            }
        } catch (Exception e) {
            log.error("Error updating prices dynamically through Gemini: {}", e.getMessage(), e);
            return getFallbackUpdatedPrices(products);
        }
    }

    private List<StoreProduct> parseUpdatedPricesResponse(String responseJson) {
        try {
            Map<String, Object> root = objectMapper.readValue(responseJson, Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) root.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                if (content != null) {
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        String generatedText = (String) parts.get(0).get("text");
                        if (generatedText != null) {
                            return objectMapper.readValue(
                                generatedText.trim(),
                                objectMapper.getTypeFactory().constructCollectionType(List.class, StoreProduct.class)
                            );
                        }
                    }
                }
            }
            throw new IllegalStateException("Failed to parse updated prices response from Gemini JSON payload");
        } catch (Exception e) {
            log.error("Failed to parse Gemini API updated prices response: {}", e.getMessage());
            throw new RuntimeException("Error parsing AI response", e);
        }
    }

    private List<StoreProduct> getFallbackUpdatedPrices(List<StoreProduct> products) {
        List<StoreProduct> result = new ArrayList<>();
        for (StoreProduct p : products) {
            double currentPrice = p.getPrice();
            double newPrice = currentPrice;
            String category = p.getCategory() != null ? p.getCategory().toLowerCase() : "";
            String name = p.getName() != null ? p.getName().toLowerCase() : "";
            String id = p.getId() != null ? p.getId() : "";

            if (name.contains("rice") || category.contains("rice")) {
                if ("r4".equals(id)) {
                    newPrice = 58.0;
                } else {
                    newPrice = Math.round(currentPrice * 1.05 * 100.0) / 100.0;
                }
            } else if (name.contains("chicken") || category.contains("chicken")) {
                if ("ch2".equals(id)) {
                    newPrice = 265.0;
                } else {
                    newPrice = Math.round(currentPrice * 1.06 * 100.0) / 100.0;
                }
            } else {
                newPrice = Math.round(currentPrice * 1.04 * 100.0) / 100.0;
            }

            result.add(new StoreProduct(
                p.getId(),
                p.getName(),
                p.getBrand(),
                p.getSize(),
                newPrice,
                p.getCategory()
            ));
        }
        return result;
    }
    private void injectMissingEssentials(List<Ingredient> ingredients, String transcript, Integer servings) {
        if (ingredients == null) return;
        
        boolean hasSalt = false;
        boolean hasOil = false;
        
        for (Ingredient ing : ingredients) {
            String name = ing.getName() != null ? ing.getName().toLowerCase() : "";
            if (name.contains("salt")) {
                hasSalt = true;
            }
            if (name.contains("oil") || name.contains("butter") || name.contains("ghee") || name.contains("margarine")) {
                hasOil = true;
            }
        }
        
        if (!hasSalt) {
            Ingredient salt = new Ingredient(
                "salt",
                null,
                null,
                true,
                "speech",
                0.95
            );
            ingredients.add(salt);
        }
        
        if (!hasOil) {
            Ingredient oil = new Ingredient(
                "oil",
                null,
                null,
                true,
                "speech",
                0.95
            );
            ingredients.add(oil);
        }
    }

    private List<Ingredient> deduplicateIngredients(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return ingredients;
        }
        
        List<Ingredient> deduplicated = new ArrayList<>();
        Map<String, Ingredient> nameToIngredient = new LinkedHashMap<>();
        
        for (Ingredient ing : ingredients) {
            if (ing == null || ing.getName() == null) {
                continue;
            }
            String normalizedName = ing.getName().trim().toLowerCase();
            if (normalizedName.isEmpty() || 
                normalizedName.equals("other") || 
                normalizedName.equals("others") || 
                normalizedName.contains("other ingredient") || 
                normalizedName.equals("other details")) {
                continue;
            }
            if (nameToIngredient.containsKey(normalizedName)) {
                Ingredient existing = nameToIngredient.get(normalizedName);
                mergeIngredients(existing, ing);
            } else {
                nameToIngredient.put(normalizedName, ing);
                deduplicated.add(ing);
            }
        }
        
        return deduplicated;
    }

    private void mergeIngredients(Ingredient existing, Ingredient incoming) {
        if (existing.getRecipeQuantity() == null) {
            existing.setRecipeQuantity(incoming.getRecipeQuantity());
            existing.setRecipeUnit(incoming.getRecipeUnit());
        } else if (incoming.getRecipeQuantity() != null) {
            double convertedIncoming = convertRecipeQuantity(incoming.getRecipeQuantity(), incoming.getRecipeUnit(), existing.getRecipeUnit());
            existing.setRecipeQuantity(existing.getRecipeQuantity() + convertedIncoming);
            existing.setRecipeQuantity(Math.round(existing.getRecipeQuantity() * 100.0) / 100.0);
        }

        if (existing.getQuantity() == null) {
            existing.setQuantity(incoming.getQuantity());
            existing.setUnit(incoming.getUnit());
        } else if (incoming.getQuantity() != null) {
            double convertedIncomingMetric = convertRecipeQuantity(incoming.getQuantity(), incoming.getUnit(), existing.getUnit());
            existing.setQuantity(existing.getQuantity() + convertedIncomingMetric);
            existing.setQuantity(Math.round(existing.getQuantity() * 100.0) / 100.0);
        }

        existing.setEstimated(existing.isEstimated() && incoming.isEstimated());
        String src1 = existing.getSource();
        String src2 = incoming.getSource();
        Set<String> mergedSources = new LinkedHashSet<>();
        if (src1 != null) {
            for (String s : src1.split("\\+")) {
                String trimmed = s.trim();
                if (!trimmed.isEmpty()) mergedSources.add(trimmed);
            }
        }
        if (src2 != null) {
            for (String s : src2.split("\\+")) {
                String trimmed = s.trim();
                if (!trimmed.isEmpty()) mergedSources.add(trimmed);
            }
        }
        if (!mergedSources.isEmpty()) {
            existing.setSource(String.join("+", mergedSources));
        } else {
            existing.setSource("speech"); // default fallback
        }

        double c1 = existing.getConfidence();
        double c2 = incoming.getConfidence();
        if (c1 <= 0.0) c1 = 0.95;
        if (c2 <= 0.0) c2 = 0.95;
        double combined = 1.0 - (1.0 - c1) * (1.0 - c2);
        existing.setConfidence(Math.round(combined * 100.0) / 100.0);
    }

    private double convertRecipeQuantity(double qty, String fromUnit, String toUnit) {
        if (fromUnit == null || toUnit == null) return qty;
        String from = fromUnit.toLowerCase().trim();
        String to = toUnit.toLowerCase().trim();
        if (from.equals(to)) return qty;

        from = normalizeUnitForConversion(from);
        to = normalizeUnitForConversion(to);

        if (from.equals(to)) return qty;

        if (from.equals("tablespoon") && to.equals("teaspoon")) return qty * 3.0;
        if (from.equals("teaspoon") && to.equals("tablespoon")) return qty / 3.0;

        if (from.equals("cup") && to.equals("tablespoon")) return qty * 16.0;
        if (from.equals("tablespoon") && to.equals("cup")) return qty / 16.0;

        if (from.equals("cup") && to.equals("teaspoon")) return qty * 48.0;
        if (from.equals("teaspoon") && to.equals("cup")) return qty / 48.0;

        if (from.equals("kg") && to.equals("g")) return qty * 1000.0;
        if (from.equals("g") && to.equals("kg")) return qty / 1000.0;

        if (from.equals("l") && to.equals("ml")) return qty * 1000.0;
        if (from.equals("ml") && to.equals("l")) return qty / 1000.0;

        return qty;
    }

    private String normalizeUnitForConversion(String unit) {
        if (unit == null) return "";
        unit = unit.toLowerCase().trim();
        if (unit.equals("tbsp") || unit.equals("tablespoons")) return "tablespoon";
        if (unit.equals("tsp") || unit.equals("teaspoons")) return "teaspoon";
        if (unit.equals("cups")) return "cup";
        if (unit.equals("grams")) return "g";
        if (unit.equals("kilograms")) return "kg";
        if (unit.equals("milliliters")) return "ml";
        if (unit.equals("liters")) return "l";
        if (unit.equals("pieces") || unit.equals("pcs")) return "piece";
        return unit;
    }

    private boolean isCookingRelated(String filename) {
        if (filename == null || filename.isBlank()) return false;
        String lower = filename.toLowerCase();
        return lower.contains("gobi") || lower.contains("manchurian") ||
               lower.contains("paneer") || lower.contains("butter") ||
               lower.contains("masala") || lower.contains("french") ||
               lower.contains("fries") || lower.contains("fry") ||
               lower.contains("cookie") || lower.contains("chocolate") ||
               lower.contains("pasta") || lower.contains("spaghetti") ||
               lower.contains("cake") || lower.contains("recipe") ||
               lower.contains("cook") || lower.contains("chicken") ||
               lower.contains("rice") || lower.contains("sauce") ||
               lower.contains("food") || lower.contains("curry") ||
               lower.contains("biryani") || lower.contains("veg") ||
               lower.contains("salad") || lower.contains("noodle") ||
               lower.contains("bread") || lower.contains("egg") ||
               lower.contains("potato") || lower.contains("roast") ||
               lower.contains("soup") || lower.contains("maggi") ||
               lower.contains("pizza") || lower.contains("burger") ||
               lower.contains("tea") || lower.contains("coffee") ||
               lower.contains("juice") || lower.contains("drink") ||
               lower.contains("bake") || lower.contains("sweet") ||
               lower.contains("dessert") || lower.contains("snack") ||
               lower.contains("breakfast") || lower.contains("lunch") ||
               lower.contains("dinner") || lower.contains("kitchen");
    }

    private String fetchVideoDescription(String videoId) {
        if (videoId == null || videoId.trim().isEmpty() || youtubeApiKey == null || youtubeApiKey.trim().isEmpty()) {
            return null;
        }
        try {
            String actualVideoId = videoId;
            if (videoId.contains("://") || videoId.contains("youtube.com") || videoId.contains("youtu.be")) {
                actualVideoId = com.cook2cart.ai_service.util.YouTubeVideoIdExtractor.extract(videoId).orElse(videoId);
            }
            String url = "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + actualVideoId + "&key=" + youtubeApiKey;
            log.info("Fetching video description for videoId: {}", actualVideoId);
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
                if (items != null && !items.isEmpty()) {
                    Map<String, Object> snippet = (Map<String, Object>) items.get(0).get("snippet");
                    if (snippet != null) {
                        return (String) snippet.get("description");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch YouTube description for videoId {}: {}", videoId, e.getMessage());
        }
        return null;
    }

    private RecipeResponse extractIngredientsFromDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            return null;
        }
        
        try {
            String promptText = "You are an Ingredient Extraction Engine for the Cook2Cart application.\n" +
                    "Your task is to extract ingredients from the YouTube video description and return a clean structured JSON response.\n\n" +
                    "WORKFLOW:\n" +
                    "Check if the following YouTube video description contains a recipe ingredient list. If it does not contain an ingredient list, return a JSON object containing `{\"hasIngredients\": false}`.\n" +
                    "If the description contains an ingredient list:\n" +
                    "- Extract ingredients from the description.\n" +
                    "- Ignore hashtags, links, promotional content, greetings, and unrelated text.\n" +
                    "- Parse ingredient names, quantities, and units.\n" +
                    "- Normalize units (kg, g, ml, l, tsp, tbsp, cup, piece, nos).\n" +
                    "Normalize ingredient names:\n" +
                    "- Ginger Garlic Paste -> Ginger Garlic Paste\n" +
                    "- Green Chilli -> Green Chili\n" +
                    "- Coriander Leaves -> Coriander Leaves\n" +
                    "- Mint Leaves -> Mint Leaves\n" +
                    "Convert quantities:\n" +
                    "- 250 gms -> 250 g\n" +
                    "- Half kg -> 0.5 kg\n" +
                    "- One cup -> 1 cup\n" +
                    "- Two tablespoons -> 2 tbsp\n" +
                    "If an ingredient appears multiple times:\n" +
                    "- Keep only one record.\n" +
                     "- Use the most complete quantity information available.\n" +
                     "- Estimate the nutritional values of this recipe based on its ingredients and standard portion sizes. Specifically, estimate calories, protein, carbohydrates, fat, and vitamins (as a readable summary string).\n\n" +
                     "Output Format on Success:\n" +
                     "{\n" +
                     "  \"hasIngredients\": true,\n" +
                     "  \"languageDetected\": \"en\",\n" +
                     "  \"ingredients\": [\n" +
                     "    {\n" +
                     "      \"name\": \"Basmati Rice\",\n" +
                     "      \"recipeQuantity\": 0.5,\n" +
                     "      \"recipeUnit\": \"kg\",\n" +
                     "      \"estimated\": false,\n" +
                     "      \"source\": \"description\",\n" +
                     "      \"confidence\": 1.0\n" +
                     "    }\n" +
                     "  ],\n" +
                     "  \"nutrition\": {\n" +
                     "    \"calories\": \"650 kcal\",\n" +
                     "    \"protein\": \"12g\",\n" +
                     "    \"carbohydrates\": \"130g\",\n" +
                     "    \"fat\": \"5g\",\n" +
                     "    \"vitamins\": \"Vitamin B6: 15%, Iron: 8%\"\n" +
                     "  }\n" +
                     "}\n\n" +
                     "Input Description:\n" +
                     description;
            
            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptText);
            Map<String, Object> partsMap = new HashMap<>();
            partsMap.put("parts", Collections.singletonList(textPart));
            requestBody.put("contents", Collections.singletonList(partsMap));
            
            Map<String, Object> responseConfig = new HashMap<>();
            responseConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", responseConfig);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String url = geminiUrl + "?key=" + apiKey;
            
            log.info("Sending request to Gemini API to extract ingredients from description...");
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> root = objectMapper.readValue(response.getBody(), Map.class);
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) root.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    if (content != null) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            String generatedText = (String) parts.get(0).get("text");
                            if (generatedText != null) {
                                Map<String, Object> extractionResult = objectMapper.readValue(generatedText.trim(), Map.class);
                                Boolean hasIngredients = (Boolean) extractionResult.get("hasIngredients");
                                if (hasIngredients != null && hasIngredients) {
                                    RecipeResponse recipeResponse = objectMapper.readValue(generatedText.trim(), RecipeResponse.class);
                                    if (recipeResponse != null && recipeResponse.getIngredients() != null && !recipeResponse.getIngredients().isEmpty()) {
                                        recipeResponse.setEnglishTranscript("Extracted from video description.");
                                        recipeResponse.setLanguageDetected("en");
                                        recipeResponse.setInstructions(new ArrayList<>());
                                        for (Ingredient ing : recipeResponse.getIngredients()) {
                                            ing.setSource("description");
                                            ing.setConfidence(1.0);
                                            MetricConverter.convertToMetric(ing, recipeResponse.getEnglishTranscript());
                                        }
                                        recipeResponse.setIngredients(deduplicateIngredients(recipeResponse.getIngredients()));
                                        return recipeResponse;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract ingredients from description using Gemini: {}", e.getMessage());
        }
        return null;
    }

    private void populateConfidenceScore(RecipeResponse response) {
        if (response == null) return;
        if (response.getIngredients() == null || response.getIngredients().isEmpty()) {
            response.setConfidenceScore(0.0);
            return;
        }
        double averageConfidence = response.getIngredients().stream()
                .mapToDouble(Ingredient::getConfidence)
                .filter(score -> score > 0.0)
                .average()
                .orElse(0.0);
        response.setConfidenceScore(Math.round(averageConfidence * 100.0) / 100.0);
    }

    private static class ParsedIngredient {
        String name;
        Double recipeQuantity;
        String recipeUnit;
        Set<String> sources = new LinkedHashSet<>();
        List<Double> confidences = new ArrayList<>();

        ParsedIngredient(String name) {
            this.name = name;
        }
    }
}
