package com.cook2cart.ai_service.repository;

import com.cook2cart.ai_service.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findByUserId(Long userId);
    List<Recipe> findByVideoId(Long videoId);
    Optional<Recipe> findFirstByVideoIdOrderByCreatedAtDesc(Long videoId);
}
