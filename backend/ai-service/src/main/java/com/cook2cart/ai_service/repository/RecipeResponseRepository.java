package com.cook2cart.ai_service.repository;

import com.cook2cart.ai_service.entity.AiRecipeResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecipeResponseRepository extends JpaRepository<AiRecipeResponse, Long> {
}
