package com.cook2cart.ai_service.service.impl;

import com.cook2cart.ai_service.dto.CombineSourcesRequest;
import com.cook2cart.ai_service.dto.Ingredient;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.dto.StoreProduct;
import com.cook2cart.ai_service.service.RecipeService;
import com.cook2cart.ai_service.service.RecipeCatalogService;
import com.cook2cart.ai_service.service.RecipeCacheService;
import com.cook2cart.ai_service.dto.RecipeCreateRequest;
import com.cook2cart.ai_service.dto.RecipeIngredientRequest;
import com.cook2cart.ai_service.dto.RecipeDTO;
import com.cook2cart.ai_service.dto.RecipeIngredientDTO;
import com.cook2cart.ai_service.util.MetricConverter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.cook2cart.ai_service.repository.RecipeRepository;
import com.cook2cart.ai_service.entity.Recipe;

import java.util.*;
import jakarta.annotation.PostConstruct;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class GeminiRecipeService implements RecipeService {

    private static final Logger log = LoggerFactory.getLogger(GeminiRecipeService.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final RecipeCatalogService recipeCatalogService;
    private final RecipeCacheService recipeCacheService;
    private final RecipeRepository recipeRepository;

    public GeminiRecipeService(RestTemplate restTemplate, ObjectMapper objectMapper, RecipeCatalogService recipeCatalogService, RecipeCacheService recipeCacheService, RecipeRepository recipeRepository) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.recipeCatalogService = recipeCatalogService;
        this.recipeCacheService = recipeCacheService;
        this.recipeRepository = recipeRepository;
    }

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.keys:}")
    private String apiKeysString;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent}")
    private String geminiUrl;

    @Value("${youtube.api.key:}")
    private String youtubeApiKey;

    private final List<String> apiKeysList = new CopyOnWriteArrayList<>();
    private final AtomicInteger currentKeyIndex = new AtomicInteger(0);

    @PostConstruct
    public void init() {
        if (apiKeysString != null && !apiKeysString.trim().isEmpty()) {
            String[] keys = apiKeysString.split(",");
            for (String k : keys) {
                String trimmed = k.trim();
                if (!trimmed.isEmpty()) {
                    apiKeysList.add(trimmed);
                }
            }
        }
        // Fallback to the single apiKey if list is empty
        if (apiKeysList.isEmpty() && apiKey != null && !apiKey.trim().isEmpty()) {
            apiKeysList.add(apiKey.trim());
        }
        log.info("Initialized GeminiRecipeService with {} API key(s)", apiKeysList.size());
    }

    private String getActiveApiKey() {
        if (apiKeysList.isEmpty()) {
            return apiKey;
        }
        int index = Math.abs(currentKeyIndex.get()) % apiKeysList.size();
        return apiKeysList.get(index);
    }

    private void rotateApiKey() {
        if (!apiKeysList.isEmpty()) {
            int nextIndex = Math.abs(currentKeyIndex.incrementAndGet()) % apiKeysList.size();
            log.info("Rotating to Gemini API key at index: {}", nextIndex);
        }
    }

    private ResponseEntity<String> postToGeminiWithFallback(Map<String, Object> requestBody, String logMessage) {
        if (apiKeysList.isEmpty()) {
            throw new IllegalStateException("No Gemini API keys are configured. Please configure gemini.api.key or gemini.api.keys in application.properties.");
        }

        List<String> errorsList = new ArrayList<>();
        int maxAttempts = apiKeysList.size();
        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            String currentKey = getActiveApiKey();
            String url = geminiUrl + "?key=" + currentKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            int keyIdx = Math.abs(currentKeyIndex.get()) % apiKeysList.size();
            log.info("{} (Attempt {}/{} using key index {})", logMessage, attempt + 1, maxAttempts, keyIdx);
            try {
                return restTemplate.postForEntity(url, entity, String.class);
            } catch (HttpClientErrorException e) {
                int statusCode = e.getStatusCode().value();
                if (statusCode == 400 || statusCode == 404) {
                    log.error("Client error ({}). Payload or URL is incorrect. Not rotating keys. Error: {}", statusCode, e.getResponseBodyAsString());
                    throw e;
                } else {
                    String errorMsg = String.format("Key at index %d failed with status %d: %s", keyIdx, statusCode, e.getMessage());
                    log.warn("Gemini API call returned status {}. Rotating to next key. Error: {}", statusCode, e.getMessage());
                    errorsList.add(errorMsg);
                    rotateApiKey();
                }
            } catch (Exception e) {
                String errorMsg = String.format("Key at index %d failed with exception: %s", keyIdx, e.getMessage());
                log.warn("Unexpected failure during Gemini API call (e.g. network timeout). Rotating to next key. Error: {}", e.getMessage());
                errorsList.add(errorMsg);
                rotateApiKey();
            }
        }
        throw new RuntimeException("All configured Gemini API keys failed: " + String.join(" | ", errorsList));
    }

    @Override
    public RecipeResponse extractFromDescription(String videoId) {
        if (videoId == null || videoId.trim().isEmpty()) {
            return null;
        }
        Optional<RecipeResponse> cachedRecipe = recipeCacheService.getRecipe(videoId);
        if (cachedRecipe.isPresent()) {
            log.info("Cache hit in extractFromDescription! Returning cached recipe for videoId: {}", videoId);
            return cachedRecipe.get();
        }
        String description = null;
        try {
            description = fetchVideoDescription(videoId);
        } catch (Exception e) {
            log.warn("Error during direct description extraction: {}", e.getMessage());
        }
        if (description != null && !description.trim().isEmpty()) {
            try {
                RecipeResponse descResponse = extractIngredientsFromDescription(description);
                if (descResponse != null && descResponse.getIngredients() != null && !descResponse.getIngredients().isEmpty()) {
                    log.info("Successfully extracted ingredients from YouTube description directly for videoId: {}", videoId);
                    populateConfidenceScore(descResponse);
                    return descResponse;
                }
            } catch (Exception e) {
                log.warn("Error extracting ingredients from description using Gemini: {}", e.getMessage());
            }
        }
        return null;
    }

    @Override
    public RecipeResponse processRecipeAudio(MultipartFile audioFile, String videoId) {
        if (videoId == null || videoId.isBlank()) {
            return processRecipeAudioInternal(audioFile, videoId);
        }
        synchronized (videoId.intern()) {
            return processRecipeAudioInternal(audioFile, videoId);
        }
    }

    private RecipeResponse processRecipeAudioInternal(MultipartFile audioFile, String videoId) {
        if (videoId != null && !videoId.isBlank()) {
            Optional<RecipeResponse> cachedRecipe = recipeCacheService.getRecipe(videoId);
            if (cachedRecipe.isPresent()) {
                log.info("Cache hit in processRecipeAudio! Returning cached recipe for videoId: {}", videoId);
                return cachedRecipe.get();
            }
        }

        // STEP 1: Check YouTube video description.
        String description = null;
        try {
            description = fetchVideoDescription(videoId);
        } catch (Exception e) {
            log.warn("Error fetching video description during audio check: {}", e.getMessage());
        }
        if (description != null && !description.trim().isEmpty()) {
            RecipeResponse descResponse = extractIngredientsFromDescription(description);
            if (descResponse != null && descResponse.getIngredients() != null && !descResponse.getIngredients().isEmpty()) {
                log.info("Successfully extracted ingredients from YouTube description. Skipping audio processing.");
                if (videoId != null && !videoId.isBlank()) {
                    recipeCacheService.cacheRecipe(videoId, descResponse);
                }
                return descResponse;
            }
        }

        if (audioFile == null || audioFile.isEmpty()) {
            throw new IllegalArgumentException("Audio file must not be empty");
        }

        if (apiKeysList.isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured. Please configure gemini.api.key or gemini.api.keys in application.properties.");
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
                     "9. Contextual & Unnamed Reference Resolution: If an ingredient is referred to in an unnamed way (e.g. \"add this powder\", \"add this masala\", \"add the prepared mixture\", \"add the ground spices\", \"add the paste\"), analyze earlier recipe steps to identify and extract the exact underlying ingredients that were roasted, ground, blended, mixed, prepared, or combined.\n" +
                     "10. Source Tracking: For every ingredient specify where it was found using 'speech', 'image', 'vision', or 'multiple'.\n" +
                     "11. Instructions Extraction: Extract detailed step-by-step cooking instructions to prepare the dish. Crucially, the instructions MUST be written in the primary language detected in the video/audio (e.g., if they speak Tamil, the instructions must be in Tamil; if they speak Hindi, the instructions must be in Hindi; if they speak English, the instructions must be in English).\n" +
                     "12. Nutrition Level Estimation: Estimate the nutritional values of this recipe based on its ingredients and standard portion sizes. Provide estimated calories, protein, carbohydrates, fat, and vitamins (as a readable summary string).\n\n" +
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

            ResponseEntity<String> response = postToGeminiWithFallback(requestBody, "Sending request to Gemini API...");

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                RecipeResponse recipeResponse = parseGeminiResponse(response.getBody());
                if (recipeResponse == null || recipeResponse.getIngredients() == null || recipeResponse.getIngredients().isEmpty()) {
                    throw new RuntimeException("Please upload cooking related videos.");
                }
                if (recipeResponse != null && recipeResponse.getIngredients() != null) {
                    for (Ingredient ing : recipeResponse.getIngredients()) {
                        MetricConverter.convertToMetric(ing, recipeResponse.getEnglishTranscript());
                        if ("ocr".equalsIgnoreCase(ing.getSource())) {
                            ing.setSource("image");
                        }
                    }
                    recipeResponse.setIngredients(deduplicateIngredients(recipeResponse.getIngredients()));
                    populateConfidenceScore(recipeResponse);
                }

                // Cache the recipe response inside the synchronized block before returning
                if (videoId != null && !videoId.isBlank()) {
                    recipeCacheService.cacheRecipe(videoId, recipeResponse);
                }

                return recipeResponse;
            } else {
                log.error("Gemini API call failed with status: {}", response.getStatusCode());
                throw new RuntimeException("Gemini API call failed with status: " + response.getStatusCode() + ". Response: " + response.getBody());
            }

        } catch (Exception e) {
            log.error("Error processing recipe audio through Gemini API: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process recipe audio: " + e.getMessage(), e);
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

    @Override
    public RecipeResponse combineIngredients(CombineSourcesRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request must not be null");
        }
        if (apiKeysList.isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured. Please configure gemini.api.key or gemini.api.keys in application.properties.");
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

            ResponseEntity<String> response = postToGeminiWithFallback(requestBody, "Sending request to Gemini API for ingredient combination...");

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                RecipeResponse recipeResponse = parseGeminiResponse(response.getBody());
                if (recipeResponse != null && recipeResponse.getIngredients() != null) {
                    Integer servings = request.getServings();
                    if (servings == null) servings = 2;
                    for (Ingredient ing : recipeResponse.getIngredients()) {
                        MetricConverter.convertToMetric(ing, recipeResponse.getEnglishTranscript(), servings);
                    }
                    recipeResponse.setIngredients(deduplicateIngredients(recipeResponse.getIngredients()));
                    populateConfidenceScore(recipeResponse);
                }
                return recipeResponse;
            } else {
                log.error("Gemini API call failed with status: {}", response.getStatusCode());
                throw new RuntimeException("Gemini API call failed with status: " + response.getStatusCode() + ". Response: " + response.getBody());
            }
        } catch (Exception e) {
            log.error("Error calling Gemini API for combination: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to combine ingredients: " + e.getMessage(), e);
        }
    }

    @Override
    public List<Ingredient> parseIngredients(List<Ingredient> ingredients, int servings) {
        if (ingredients == null || ingredients.isEmpty()) {
            return new ArrayList<>();
        }

        if (apiKeysList.isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured. Please configure gemini.api.key or gemini.api.keys in application.properties.");
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
                    "6. Retain other fields like source and confidence.\n\n" +
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

            ResponseEntity<String> response = postToGeminiWithFallback(requestBody, "Sending request to Gemini API to parse ingredients dynamically...");

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Ingredient> parsedList = parseIngredientsResponse(response.getBody());
                if (parsedList != null) {
                    for (Ingredient ing : parsedList) {
                        MetricConverter.convertToMetric(ing, "serves " + servings, servings);
                    }
                    parsedList = deduplicateIngredients(parsedList);
                }
                return parsedList;
            } else {
                throw new RuntimeException("Gemini API call failed with status: " + response.getStatusCode() + ". Response: " + response.getBody());
            }
        } catch (Exception e) {
            log.error("Error parsing ingredients dynamically through Gemini: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to parse ingredients dynamically: " + e.getMessage(), e);
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

    @Override
    public List<StoreProduct> updateLatestPrices(List<StoreProduct> products) {
        if (products == null || products.isEmpty()) {
            return new ArrayList<>();
        }

        if (apiKeysList.isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured. Please configure gemini.api.key or gemini.api.keys in application.properties.");
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

            ResponseEntity<String> response = postToGeminiWithFallback(requestBody, "Sending request to Gemini API to update prices dynamically...");

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseUpdatedPricesResponse(response.getBody());
            } else {
                throw new RuntimeException("Gemini API call failed with status: " + response.getStatusCode() + ". Response: " + response.getBody());
            }
        } catch (Exception e) {
            log.error("Error updating prices dynamically through Gemini: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update prices: " + e.getMessage(), e);
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
            
            ResponseEntity<String> response = postToGeminiWithFallback(requestBody, "Sending request to Gemini API to extract ingredients from description...");
            
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
            log.error("Failed to extract ingredients from description using Gemini: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to extract ingredients from description: " + e.getMessage(), e);
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

    private String fetchVideoTranscript(String videoId) {
        try {
            String actualVideoId = videoId;
            if (videoId.contains("://") || videoId.contains("youtube.com") || videoId.contains("youtu.be")) {
                actualVideoId = com.cook2cart.ai_service.util.YouTubeVideoIdExtractor.extract(videoId).orElse(videoId);
            }
            String url = "http://localhost:8089/transcript?video_id=" + actualVideoId;
            log.info("Fetching video transcript for videoId: {}", actualVideoId);
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("transcript")) {
                return (String) response.get("transcript");
            }
        } catch (Exception e) {
            log.warn("Failed to fetch transcript from python service for videoId {}: {}", videoId, e.getMessage());
        }
        return null;
    }

    private RecipeResponse extractIngredientsFromTranscript(String transcript) {
        if (transcript == null || transcript.trim().isEmpty()) {
            return null;
        }
        
        try {
            String promptText = "You are an Ingredient Extraction Engine for the Cook2Cart application.\n" +
                    "Your task is to extract ingredients from the YouTube video transcript and return a clean structured JSON response.\n\n" +
                    "WORKFLOW:\n" +
                    "Check if the following YouTube video transcript contains a recipe ingredient list or describes preparing a dish. If it does not contain recipe ingredients, return a JSON object containing `{\"hasIngredients\": false}`.\n" +
                     "If it contains a recipe:\n" +
                     "- Extract ingredients from the transcript.\n" +
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
                     "- Estimate the nutritional values of this recipe based on its ingredients and standard portion sizes.\n\n" +
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
                     "      \"source\": \"transcript\",\n" +
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
                     "Input Transcript:\n" +
                     transcript;
            
            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", promptText);
            Map<String, Object> partsMap = new HashMap<>();
            partsMap.put("parts", Collections.singletonList(textPart));
            requestBody.put("contents", Collections.singletonList(partsMap));
            
            Map<String, Object> responseConfig = new HashMap<>();
            responseConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", responseConfig);
            
            ResponseEntity<String> response = postToGeminiWithFallback(requestBody, "Sending request to Gemini API to extract ingredients from transcript...");
            
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
                                        recipeResponse.setEnglishTranscript("Extracted from video transcript.");
                                        recipeResponse.setLanguageDetected("en");
                                        recipeResponse.setInstructions(new ArrayList<>());
                                        for (Ingredient ing : recipeResponse.getIngredients()) {
                                            ing.setSource("transcript");
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
            log.error("Failed to extract ingredients from transcript using Gemini: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to extract ingredients from transcript: " + e.getMessage(), e);
        }
        return null;
    }

    private String getIngredientNamesCSV(List<Ingredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < ingredients.size(); i++) {
            sb.append(ingredients.get(i).getName());
            if (i < ingredients.size() - 1) {
                sb.append(", ");
            }
        }
        return sb.toString();
    }

    private Map<String, Object> createRecipeAndCartWorkflow(
            RecipeResponse recipeResponse,
            String youtubeVideoId,
            Long dbVideoId,
            Long userId,
            String recipeName,
            String thumbnailUrl,
            String successStatus
    ) {
        log.info("Generating recipe and cart in backend for videoId={}, successStatus={}", youtubeVideoId, successStatus);
        Map<String, Object> result = new HashMap<>();
        
        // 1. Create RecipeCreateRequest
        List<RecipeIngredientRequest> ingRequests = new ArrayList<>();
        for (Ingredient ing : recipeResponse.getIngredients()) {
            ingRequests.add(new RecipeIngredientRequest(
                    ing.getName(),
                    ing.getRecipeQuantity(),
                    ing.getRecipeUnit(),
                    ing.getRecipeQuantity(),
                    ing.getRecipeUnit(),
                    ing.isEstimated(),
                    ing.getSource(),
                    ing.getConfidence()
            ));
        }
        
        List<String> instructions = recipeResponse.getInstructions();
        if (instructions == null || instructions.isEmpty()) {
            instructions = Arrays.asList(
                    "Prepare all ingredients: " + getIngredientNamesCSV(recipeResponse.getIngredients()),
                    "Measure and arrange the ingredients according to the quantities.",
                    "Follow the cooking steps to prepare the dish."
            );
        }
        
        RecipeCreateRequest createRecipeRequest = new RecipeCreateRequest(
                userId,
                dbVideoId,
                youtubeVideoId,
                recipeName,
                null,
                thumbnailUrl,
                ingRequests,
                instructions
        );
        
        // Save the recipe
        RecipeDTO savedRecipe = recipeCatalogService.createRecipe(createRecipeRequest);
        Long recipeId = savedRecipe.id();
        log.info("Saved recipe to database with ID: {}", recipeId);
        
        // 2. Call product-service to generate suggestions
        List<Map<String, Object>> suggestionsGroups = null;
        try {
            String productServiceUrl = "http://localhost:8085/products/generate/" + recipeId;
            log.info("Calling product-service to generate suggestions: {}", productServiceUrl);
            List response = restTemplate.postForObject(productServiceUrl, null, List.class);
            suggestionsGroups = (List<Map<String, Object>>) response;
            log.info("Generated product suggestions for recipeId: {}, groups count: {}", recipeId, suggestionsGroups != null ? suggestionsGroups.size() : 0);
        } catch (Exception e) {
            log.error("Failed to generate product suggestions from product-service: {}", e.getMessage(), e);
        }
        
        // 3. Call cart-service to initialize the cart
        Map<String, Object> cartResponse = null;
        if (suggestionsGroups != null && !suggestionsGroups.isEmpty()) {
            try {
                List<Map<String, Object>> cartItems = new ArrayList<>();
                
                // For each group, pick the first suggestion (primary product recommendation)
                for (Map<String, Object> group : suggestionsGroups) {
                    Long recipeIngredientId = null;
                    if (group.get("recipeIngredientId") != null) {
                        recipeIngredientId = Long.valueOf(group.get("recipeIngredientId").toString());
                    }
                    String ingredientName = (String) group.get("ingredientName");
                    
                    List<Map<String, Object>> suggestions = (List<Map<String, Object>>) group.get("suggestions");
                    if (suggestions != null && !suggestions.isEmpty()) {
                        Map<String, Object> firstSuggestion = suggestions.get(0);
                        
                        // Map firstSuggestion to ProductRequest DTO structure for cart-service
                        Map<String, Object> productRequest = new HashMap<>();
                        productRequest.put("ingredientId", recipeIngredientId);
                        productRequest.put("productName", firstSuggestion.get("productName"));
                        productRequest.put("brand", firstSuggestion.get("brandName"));
                        productRequest.put("size", firstSuggestion.get("packQuantity"));
                        productRequest.put("price", firstSuggestion.get("marketPrice"));
                        productRequest.put("imageUrl", firstSuggestion.get("imageUrl"));
                        productRequest.put("source", "PRODUCT_SERVICE");
                        productRequest.put("availability", "AVAILABLE");
                        
                        // Save product in cart-service database
                        String saveProductUrl = "http://localhost:8084/api/carts/products";
                        log.info("Saving product in cart-service: {}", saveProductUrl);
                        Map<String, Object> savedProduct = restTemplate.postForObject(saveProductUrl, productRequest, Map.class);
                        Long selectedProductId = null;
                        if (savedProduct != null && savedProduct.get("id") != null) {
                            selectedProductId = Long.valueOf(savedProduct.get("id").toString());
                        }
                        
                        // Find matching recipe ingredient quantity and unit from the savedRecipe DTO
                        Double recipeQuantity = 1.0;
                        String recipeUnit = "pcs";
                        if (savedRecipe.ingredients() != null) {
                            for (RecipeIngredientDTO ring : savedRecipe.ingredients()) {
                                if (ring.id().equals(recipeIngredientId) || ring.ingredientName().equalsIgnoreCase(ingredientName)) {
                                    recipeQuantity = ring.recipeQuantity() != null ? ring.recipeQuantity() : 1.0;
                                    recipeUnit = ring.recipeUnit() != null ? ring.recipeUnit() : "pcs";
                                    break;
                                }
                            }
                        }
                        
                        // Build CartItemRequest JSON
                        Map<String, Object> cartItemRequest = new HashMap<>();
                        cartItemRequest.put("ingredientId", recipeIngredientId);
                        cartItemRequest.put("selectedProductId", selectedProductId);
                        cartItemRequest.put("recipeId", recipeId);
                        cartItemRequest.put("ingredientName", ingredientName);
                        cartItemRequest.put("recipeQuantity", recipeQuantity);
                        cartItemRequest.put("recipeUnit", recipeUnit);
                        cartItemRequest.put("quantity", 1.0); // Default 1 pack/unit
                        cartItemRequest.put("unit", "pack");
                        cartItemRequest.put("price", firstSuggestion.get("marketPrice"));
                        cartItemRequest.put("estimatedPrice", firstSuggestion.get("marketPrice"));
                        cartItemRequest.put("availableAtHome", false);
                        cartItemRequest.put("selectedProduct", productRequest);
                        
                        cartItems.add(cartItemRequest);
                    }
                }
                
                // Build CartCreateRequest JSON
                Map<String, Object> cartCreateRequest = new HashMap<>();
                cartCreateRequest.put("userId", userId);
                cartCreateRequest.put("originalServings", 2);
                cartCreateRequest.put("targetServings", 2);
                cartCreateRequest.put("items", cartItems);
                
                // Send CartCreateRequest to cart-service
                String createCartUrl = "http://localhost:8084/api/carts";
                log.info("Creating cart in cart-service: {}", createCartUrl);
                cartResponse = restTemplate.postForObject(createCartUrl, cartCreateRequest, Map.class);
                log.info("Successfully created shopping cart: {}", cartResponse);
            } catch (Exception e) {
                log.error("Failed to generate shopping cart from cart-service: {}", e.getMessage(), e);
            }
        }
        
        result.put("status", successStatus);
        result.put("recipeId", recipeId);
        result.put("recipe", savedRecipe);
        if (cartResponse != null) {
            result.put("cartId", cartResponse.get("id"));
            result.put("cart", cartResponse);
        }
        return result;
    }

    @Override
    public Map<String, Object> processVideoWorkflow(String videoId, String youtubeUrl, Long dbVideoId, Long userId, String recipeName, String thumbnailUrl) {
        log.info("Starting processVideoWorkflow for videoId: {}, userId: {}", videoId, userId);
        Map<String, Object> result = new HashMap<>();
        
        // STEP 0: Check Redis Cache first
        Optional<RecipeResponse> cachedRecipe = recipeCacheService.getRecipe(videoId);
        if (cachedRecipe.isPresent()) {
            log.info("Workflow cache hit! Extracting ingredients from Redis cache for videoId: {}", videoId);
            return createRecipeAndCartWorkflow(cachedRecipe.get(), videoId, dbVideoId, userId, recipeName, thumbnailUrl, "CART_GENERATED_FROM_CACHE");
        }

        // STEP 0.5: Check Database catalog first
        if (dbVideoId != null) {
            Optional<Recipe> dbRecipeOpt = recipeRepository.findLatestIdByVideoId(dbVideoId)
                    .flatMap(recipeRepository::findByIdWithDetails);
            if (dbRecipeOpt.isPresent()) {
                log.info("Workflow database hit! Loading ingredients from database for dbVideoId: {}", dbVideoId);
                Recipe dbRecipe = dbRecipeOpt.get();
                RecipeResponse recipeResponse = toRecipeResponse(dbRecipe);
                // Cache it in Redis
                recipeCacheService.cacheRecipe(videoId, recipeResponse);
                return createRecipeAndCartWorkflow(recipeResponse, videoId, dbVideoId, userId, recipeName, thumbnailUrl, "CART_GENERATED_FROM_CACHE");
            }
        }
        
        // STEP 1: Check YouTube Description
        RecipeResponse descRecipe = extractFromDescription(videoId);
        if (descRecipe != null && descRecipe.getIngredients() != null && !descRecipe.getIngredients().isEmpty()) {
            log.info("Step 1: Ingredients found in YouTube description directly! Saving to Redis.");
            recipeCacheService.cacheRecipe(videoId, descRecipe);
            return createRecipeAndCartWorkflow(descRecipe, videoId, dbVideoId, userId, recipeName, thumbnailUrl, "CART_GENERATED_FROM_DESCRIPTION");
        }
        
        // STEP 2: Use YouTube Transcript
        log.info("Step 1: No ingredients found in description. Moving to Step 2: YouTube Transcript...");
        String transcript = fetchVideoTranscript(videoId);
        if (transcript != null && !transcript.trim().isEmpty()) {
            try {
                RecipeResponse transRecipe = extractIngredientsFromTranscript(transcript);
                if (transRecipe != null && transRecipe.getIngredients() != null && !transRecipe.getIngredients().isEmpty()) {
                    log.info("Step 2: Ingredients found in transcript! Saving to Redis.");
                    recipeCacheService.cacheRecipe(videoId, transRecipe);
                    return createRecipeAndCartWorkflow(transRecipe, videoId, dbVideoId, userId, recipeName, thumbnailUrl, "CART_GENERATED_FROM_TRANSCRIPT");
                }
            } catch (Exception e) {
                log.warn("Error extracting ingredients from transcript using Gemini: {}", e.getMessage());
            }
        }
        
        // STEP 3: Fallback to Audio Extraction
        log.info("Step 2: No transcript available or no ingredients in transcript. Fallback to Audio Extraction.");
        result.put("status", "FALLBACK_TO_AUDIO_EXTRACTION");
        return result;
    }

    private RecipeResponse toRecipeResponse(Recipe recipe) {
        RecipeResponse response = new RecipeResponse();
        response.setId(recipe.getId());
        response.setLanguageDetected("en");
        response.setConfidenceScore(1.0);
        response.setEnglishTranscript("Retrieved from database catalog.");
        
        List<com.cook2cart.ai_service.dto.Ingredient> ingredients = recipe.getIngredients().stream()
                .map(item -> {
                    com.cook2cart.ai_service.dto.Ingredient ing = new com.cook2cart.ai_service.dto.Ingredient();
                    ing.setName(item.getIngredient() != null ? item.getIngredient().getName() : null);
                    ing.setRecipeQuantity(item.getRecipeQuantity());
                    ing.setRecipeUnit(item.getRecipeUnit());
                    ing.setQuantity(item.getQuantity());
                    ing.setUnit(item.getUnit());
                    ing.setEstimated(item.getEstimated() != null ? item.getEstimated() : false);
                    ing.setSource(item.getSource() != null ? item.getSource() : "database");
                    ing.setConfidence(item.getConfidence() != null ? item.getConfidence() : 1.0);
                    return ing;
                })
                .toList();
        response.setIngredients(ingredients);
        
        List<String> instructions = recipe.getInstructions().stream()
                .map(com.cook2cart.ai_service.entity.RecipeInstruction::getInstruction)
                .toList();
        response.setInstructions(instructions);
        response.setNutrition(null);
        
        return response;
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
