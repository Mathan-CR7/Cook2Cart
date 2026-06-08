package com.cook2cart.cart_service.repository;

import com.cook2cart.cart_service.entity.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<ProductEntity, Long> {
    List<ProductEntity> findByIngredientId(Long ingredientId);

    Optional<ProductEntity> findByIngredientIdAndProductNameIgnoreCaseAndBrandIgnoreCaseAndSizeIgnoreCaseAndSourceIgnoreCase(
            Long ingredientId,
            String productName,
            String brand,
            String size,
            String source
    );
}
