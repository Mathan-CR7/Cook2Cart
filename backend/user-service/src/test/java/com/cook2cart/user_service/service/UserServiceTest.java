package com.cook2cart.user_service.service;

import com.cook2cart.user_service.dto.UserResponse;
import com.cook2cart.user_service.entity.User;
import com.cook2cart.user_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .name("Mathan")
                .email("mathan@example.com")
                .firstName("Mathan")
                .lastName("Prashath")
                .contact("1234567890")
                .build();
    }

    @Test
    void getProfile_Success() {
        when(userRepository.findByEmail("mathan@example.com")).thenReturn(Optional.of(user));

        UserResponse response = userService.getProfile("mathan@example.com");

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("Mathan", response.getName());
        assertEquals("mathan@example.com", response.getEmail());
        assertEquals("Mathan", response.getFirstName());
        assertEquals("Prashath", response.getLastName());
        assertEquals("1234567890", response.getContact());
        verify(userRepository, times(1)).findByEmail("mathan@example.com");
    }

    @Test
    void getProfile_UserNotFound() {
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> 
            userService.getProfile("nonexistent@example.com")
        );
        verify(userRepository, times(1)).findByEmail("nonexistent@example.com");
    }
}
