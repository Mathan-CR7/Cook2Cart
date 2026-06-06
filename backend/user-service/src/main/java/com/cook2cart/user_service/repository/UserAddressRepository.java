package com.cook2cart.user_service.repository;

import com.cook2cart.user_service.entity.User;
import com.cook2cart.user_service.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserAddressRepository extends JpaRepository<UserAddress, Long> {

    List<UserAddress> findByUser(User user);

}