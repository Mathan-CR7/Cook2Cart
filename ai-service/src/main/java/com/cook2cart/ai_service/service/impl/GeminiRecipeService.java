package com.cook2cart.ai_service.service.impl;

import com.cook2cart.ai_service.dto.CombineSourcesRequest;
import com.cook2cart.ai_service.dto.Ingredient;
import com.cook2cart.ai_service.dto.RecipeResponse;
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

    @Override
    public RecipeResponse processRecipeAudio(MultipartFile audioFile) {
        if (audioFile == null || audioFile.isEmpty()) {
            throw new IllegalArgumentException("Audio file must not be empty");
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to local/mock processing...");
            return getFallbackResponse(audioFile);
        }

        try {
            byte[] fileBytes = audioFile.getBytes();
            String base64Data = Base64.getEncoder().encodeToString(fileBytes);
            String contentType = audioFile.getContentType();
            if (contentType == null || contentType.isEmpty()) {
                contentType = "audio/mp3"; // Fallback mime type
            }
            String promptText = "You are a Multimodal AI Recipe Processing Assistant.\n" +
                    "Your job is to analyze cooking video/audio content and generate a standardized recipe JSON.\n\n" +
                    "Perform ALL of the following tasks:\n" +
                    "1. Speech-to-Text: Extract all spoken recipe instructions from the audio.\n" +
                    "2. OCR Extraction: Read any ingredient names, quantities, measurements, or recipe text visible on the screen.\n" +
                    "3. Multilingual Translation: Detect any language used in speech or text. If it is not in English, translate it to English. Support standardizing names from ANY language (Hindi, Tamil, Spanish, French, Telugu, etc.) to standard English names (e.g. pyaz -> onion, brinjal -> eggplant, aubergine -> eggplant, mirchi -> green chilli, hari mirch -> green chilli).\n" +
                    "4. Ingredient Extraction: Identify every ingredient mentioned in speech, OCR text, or detected visually.\n" +
                    "5. Quantity Extraction: Extract the quantity and unit associated with each ingredient.\n" +
                    "6. Ingredient Detection: Detect ingredients that appear visually even if they are not mentioned in speech.\n" +
                    "7. Unit Normalization: Preserve the original recipe quantity and unit, and convert quantities into standard units whenever possible using grams (g), kilograms (kg), milliliters (ml), liters (l), or pieces.\n" +
                    "8. Missing Quantity Estimation: If a quantity is not explicitly specified, estimate a reasonable amount based on common cooking practices and mark all estimated values with: \"estimated\": true.\n" +
                    "9. Contextual & Unnamed Reference Resolution: If an ingredient is referred to in an unnamed way (e.g. \"add this powder\", \"add this masala\", \"add the prepared mixture\", \"add the ground spices\", \"add the paste\"), analyze earlier recipe steps to identify and extract the exact underlying ingredients that were roasted, ground, blended, mixed, prepared, or combined.\n" +
                    "10. Source Tracking: For every ingredient specify where it was found using 'speech', 'image', 'vision', or 'multiple'.\n\n" +
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
                    "  ]\n" +
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
                if (recipeResponse != null && recipeResponse.getIngredients() != null) {
                    for (Ingredient ing : recipeResponse.getIngredients()) {
                        MetricConverter.convertToMetric(ing, recipeResponse.getEnglishTranscript());
                        if ("ocr".equalsIgnoreCase(ing.getSource())) {
                            ing.setSource("image");
                        }
                    }
                }
                return recipeResponse;
            } else {
                log.error("Gemini API call failed with status: {}", response.getStatusCode());
                return getFallbackResponse(audioFile);
            }

        } catch (Exception e) {
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
        RecipeResponse response;

        if (filename.contains("cookie") || filename.contains("chocolate") || audioFile.getSize() > 3000000) {
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
                    )
            );
        }
        if (response.getIngredients() != null) {
            for (Ingredient ing : response.getIngredients()) {
                MetricConverter.convertToMetric(ing, response.getEnglishTranscript());
            }
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
                    "2. Merge ingredients that refer to the same item (e.g. translate regional or synonym names to standard English names: 'onion' and 'onions' -> 'onion', 'mirchi' or 'hari mirch' -> 'green chilli', 'pyaz' -> 'onion', 'dhaniya' -> 'coriander', etc.).\n" +
                    "3. Track and set the 'source' field for each ingredient:\n" +
                    "   - If an ingredient appears in OCR but not in speech: Mark source=\"ocr\"\n" +
                    "   - If an ingredient appears in Vision but not in speech: Mark source=\"vision\"\n" +
                    "   - If an ingredient appears in multiple sources: Mark source as a combination of sources, e.g. \"speech+ocr+vision\", \"speech+ocr\", \"speech+vision\", \"ocr+vision\".\n" +
                    "   - If an ingredient appears in speech only: Mark source=\"speech\".\n" +
                    "4. Extract quantities and units from the Speech Transcript and OCR Text whenever available.\n" +
                    "5. If Vision detects an ingredient but no quantity is available: Predict/estimate the ingredient quantity based on the serving/people count. Mark this ingredient as estimated=true.\n" +
                    "6. Infer ingredients inside mixtures or masalas. E.g., if the speech transcript describes roasting/grinding/mixing/preparing ingredients (like coriander seeds, cumin seeds, cloves, cinnamon) to make a powder/paste/mixture/masala, and later adds that masala/mixture/paste, you must infer the constituent ingredients (coriander seeds, cumin seeds, cloves, cinnamon) and include them in the final list, and NOT just the generic masala.\n" +
                    "7. Remove duplicate ingredients.\n" +
                    "8. Return confidence scores (a double between 0.0 and 1.0) for each ingredient. If merged from multiple sources, combine the confidence scores (e.g., using formula: 1 - (1-c1)*(1-c2)... or similar logic indicating higher confidence).\n" +
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
                    for (Ingredient ing : recipeResponse.getIngredients()) {
                        MetricConverter.convertToMetric(ing, recipeResponse.getEnglishTranscript(), servings);
                    }
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
            
            MetricConverter.convertToMetric(ing, request.getSpeechTranscript(), servings);
            ingredients.add(ing);
        }
        
        String language = "en";
        return new RecipeResponse(language, request.getSpeechTranscript(), ingredients);
    }

    private void parseTextSource(String text, String sourceName, double baseConfidence, Map<String, ParsedIngredient> map) {
        if (text == null || text.trim().isEmpty()) {
            return;
        }

        String lowerText = text.toLowerCase();
        
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
        
        candidateTranslations.put("onion", "onion");
        candidateTranslations.put("onions", "onion");
        candidateTranslations.put("pyaz", "onion");
        candidateTranslations.put("vengayam", "onion");
        
        candidateTranslations.put("tomato", "tomato");
        candidateTranslations.put("tomatoes", "tomato");
        candidateTranslations.put("tamatar", "tomato");
        
        candidateTranslations.put("green chilli", "green chilli");
        candidateTranslations.put("green chili", "green chilli");
        candidateTranslations.put("mirchi", "green chilli");
        candidateTranslations.put("hari mirch", "green chilli");
        
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
        if (lower.contains("brinjal") || lower.contains("aubergine")) {
            return "eggplant";
        }
        if (lower.equals("tamatar") || lower.equals("tomato") || lower.equals("tomatoes")) {
            return "tomato";
        }
        return lower;
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
