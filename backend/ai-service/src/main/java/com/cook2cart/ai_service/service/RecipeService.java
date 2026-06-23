package com.cook2cart.ai_service.service;

import com.cook2cart.ai_service.dto.CombineSourcesRequest;
import com.cook2cart.ai_service.dto.Ingredient;
import com.cook2cart.ai_service.dto.RecipeResponse;
import com.cook2cart.ai_service.dto.StoreProduct;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface RecipeService {
    RecipeResponse processRecipeAudio(MultipartFile audioFile, String videoId);
    RecipeResponse combineIngredients(CombineSourcesRequest request);
    List<Ingredient> parseIngredients(List<Ingredient> ingredients, int servings);
    List<StoreProduct> updateLatestPrices(List<StoreProduct> products);
    RecipeResponse extractFromDescription(String videoId);
    java.util.Map<String, Object> processVideoWorkflow(String videoId, String youtubeUrl, Long dbVideoId, Long userId, String recipeName, String thumbnailUrl);
}
