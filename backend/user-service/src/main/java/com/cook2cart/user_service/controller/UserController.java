package com.cook2cart.user_service.controller;


import com.cook2cart.user_service.dto.UserResponse;
import com.cook2cart.user_service.security.AuthenticatedUserResolver;
import com.cook2cart.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuthenticatedUserResolver authenticatedUserResolver;

    @GetMapping("/profile")
    public UserResponse getProfile(Authentication authentication) {
        return userService.getProfile(authenticatedUserResolver.resolveEmail(authentication));
    }
}
