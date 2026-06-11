package com.cook2cart.user_service.controller;

import com.cook2cart.user_service.dto.AddressRequest;
import com.cook2cart.user_service.dto.AddressResponse;
import com.cook2cart.user_service.dto.LocationRequest;
import com.cook2cart.user_service.security.AuthenticatedUserResolver;
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
    private final AuthenticatedUserResolver authenticatedUserResolver;

    @PostMapping("/manual")
    public AddressResponse saveManualAddress(
            Authentication authentication,
            @RequestBody AddressRequest request) {

        return addressService.saveManualAddress(
                authenticatedUserResolver.resolveEmail(authentication),
                request);
    }

    @PostMapping("/current-location")
    public AddressResponse saveCurrentLocation(
            Authentication authentication,
            @RequestBody LocationRequest request) {

        return addressService.saveCurrentLocation(
                authenticatedUserResolver.resolveEmail(authentication),
                request);
    }

    @GetMapping
    public List<AddressResponse> getAddresses(
            Authentication authentication) {

        return addressService.getAddresses(
                authenticatedUserResolver.resolveEmail(authentication));
    }
}
