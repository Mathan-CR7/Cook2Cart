package com.cook2cart.user_service.controller;

import com.cook2cart.user_service.dto.AddressRequest;
import com.cook2cart.user_service.dto.AddressResponse;
import com.cook2cart.user_service.dto.LocationRequest;
import com.cook2cart.user_service.service.AddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/address")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @PostMapping("/manual")
    public AddressResponse saveManualAddress(
            Authentication authentication,
            @RequestBody AddressRequest request) {

        return addressService.saveManualAddress(
                currentEmail(authentication),
                request);
    }

    @PostMapping("/current-location")
    public AddressResponse saveCurrentLocation(
            Authentication authentication,
            @RequestBody LocationRequest request) {

        return addressService.saveCurrentLocation(
                currentEmail(authentication),
                request);
    }

    @GetMapping
    public List<AddressResponse> getAddresses(
            Authentication authentication) {

        return addressService.getAddresses(
                currentEmail(authentication));
    }

    private String currentEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required");
        }
        return authentication.getName();
    }
}
