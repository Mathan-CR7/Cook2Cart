package com.cook2cart.productservice.config;

import com.cook2cart.productservice.dto.RecipeIngredientDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "${recipe-service.name}")
public interface RecipeServiceClient {

    @GetMapping("/api/recipes/{recipeId}/ingredients")
    List<RecipeIngredientDTO> getRecipeIngredients(@PathVariable Long recipeId);
}
