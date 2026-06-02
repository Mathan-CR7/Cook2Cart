package com.cook2cart.ai_service.service;

import com.cook2cart.ai_service.dto.RecipeResponse;
import org.springframework.web.multipart.MultipartFile;

public interface RecipeService {
    RecipeResponse processRecipeAudio(MultipartFile audioFile);
}
