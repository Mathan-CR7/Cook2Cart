package com.cook2cart.user_service.controller;

import com.cook2cart.user_service.dto.AuthResponse;
import com.cook2cart.user_service.dto.LoginRequest;
import com.cook2cart.user_service.dto.RegisterRequest;
import com.cook2cart.user_service.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public String register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}