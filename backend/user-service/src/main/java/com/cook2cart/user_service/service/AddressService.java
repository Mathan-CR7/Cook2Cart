package com.cook2cart.user_service.service;


import com.cook2cart.user_service.dto.AddressRequest;
import com.cook2cart.user_service.dto.LocationRequest;
import com.cook2cart.user_service.entity.User;
import com.cook2cart.user_service.entity.UserAddress;
import com.cook2cart.user_service.repository.UserAddressRepository;
import com.cook2cart.user_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final UserRepository userRepository;
    private final UserAddressRepository addressRepository;

    public String saveManualAddress(String email,
                                    AddressRequest request) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserAddress address = UserAddress.builder()
                .doorNo(request.getDoorNo())
                .street(request.getStreet())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .addressType("MANUAL")
                .isDefault(Boolean.TRUE.equals(request.getIsDefault()))
                .createdAt(LocalDateTime.now())
                .user(user)
                .build();

        addressRepository.save(address);

        return "Address Saved Successfully";
    }

    public String saveCurrentLocation(String email,
                                      LocationRequest request) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserAddress address = UserAddress.builder()
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .addressType("CURRENT_LOCATION")
                .isDefault(false)
                .createdAt(LocalDateTime.now())
                .user(user)
                .build();

        addressRepository.save(address);

        return "Location Saved Successfully";
    }

    public List<UserAddress> getAddresses(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return addressRepository.findByUser(user);
    }
}
