package com.cook2cart.ai_service.repository;

import com.cook2cart.ai_service.entity.IngredientEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IngredientRepository extends JpaRepository<IngredientEntity, Long> {
    Optional<IngredientEntity> findByNameIgnoreCase(String name);
}
