package com.cook2cart.user_service.service;


import com.cook2cart.user_service.dto.AddressRequest;
import com.cook2cart.user_service.dto.AddressResponse;
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

    public AddressResponse saveManualAddress(String email,
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

        return toResponse(addressRepository.save(address));
    }

    public AddressResponse saveCurrentLocation(String email,
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

        return toResponse(addressRepository.save(address));
    }

    public List<AddressResponse> getAddresses(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return addressRepository.findByUser(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private AddressResponse toResponse(UserAddress address) {
        return AddressResponse.builder()
                .id(address.getId())
                .addressType(address.getAddressType())
                .latitude(address.getLatitude())
                .longitude(address.getLongitude())
                .doorNo(address.getDoorNo())
                .street(address.getStreet())
                .city(address.getCity())
                .state(address.getState())
                .pincode(address.getPincode())
                .isDefault(address.getIsDefault())
                .createdAt(address.getCreatedAt())
                .build();
    }
}
