package com.cook2cart.cart_service.repository;

import com.cook2cart.cart_service.entity.CartEntity;
import com.cook2cart.cart_service.entity.CartStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartEntityRepository extends JpaRepository<CartEntity, Long> {
    List<CartEntity> findByUserId(Long userId);
    Optional<CartEntity> findByUserIdAndStatus(Long userId, CartStatus status);
}
