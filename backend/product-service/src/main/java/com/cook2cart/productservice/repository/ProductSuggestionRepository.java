package com.cook2cart.productservice.repository;

import com.cook2cart.productservice.entity.ProductSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductSuggestionRepository extends JpaRepository<ProductSuggestion, Long> {
    List<ProductSuggestion> findByRecipeIdOrderByRecipeIngredientIdAscCreatedAtDesc(Long recipeId);

    void deleteByRecipeId(Long recipeId);
}
