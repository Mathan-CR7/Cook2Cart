package com.cook2cart.user_service.controller;

import com.cook2cart.user_service.dto.AddressRequest;
import com.cook2cart.user_service.dto.LocationRequest;
import com.cook2cart.user_service.entity.UserAddress;
import com.cook2cart.user_service.service.AddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/address")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @PostMapping("/manual")
    public String saveManualAddress(
            Authentication authentication,
            @RequestBody AddressRequest request) {

        return addressService.saveManualAddress(
                authentication.getName(),
                request);
    }

    @PostMapping("/current-location")
    public String saveCurrentLocation(
            Authentication authentication,
            @RequestBody LocationRequest request) {

        return addressService.saveCurrentLocation(
                authentication.getName(),
                request);
    }

    @GetMapping
    public List<UserAddress> getAddresses(
            Authentication authentication) {

        return addressService.getAddresses(
                authentication.getName());
    }
}