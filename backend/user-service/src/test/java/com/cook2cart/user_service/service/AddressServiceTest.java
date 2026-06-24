package com.cook2cart.user_service.service;

import com.cook2cart.user_service.dto.AddressRequest;
import com.cook2cart.user_service.dto.AddressResponse;
import com.cook2cart.user_service.dto.LocationRequest;
import com.cook2cart.user_service.entity.User;
import com.cook2cart.user_service.entity.UserAddress;
import com.cook2cart.user_service.repository.UserAddressRepository;
import com.cook2cart.user_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AddressServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAddressRepository addressRepository;

    @InjectMocks
    private AddressService addressService;

    private User user;
    private UserAddress manualAddress;
    private UserAddress currentLocationAddress;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .name("Mathan")
                .email("mathan@example.com")
                .build();

        manualAddress = UserAddress.builder()
                .id(101L)
                .doorNo("123")
                .street("Main St")
                .city("Chennai")
                .state("TN")
                .pincode("600001")
                .addressType("MANUAL")
                .isDefault(true)
                .user(user)
                .build();

        currentLocationAddress = UserAddress.builder()
                .id(102L)
                .latitude(13.0827)
                .longitude(80.2707)
                .addressType("CURRENT_LOCATION")
                .isDefault(false)
                .user(user)
                .build();
    }

    @Test
    void saveManualAddress_Success() {
        AddressRequest request = new AddressRequest("123", "Main St", "Chennai", "TN", "600001", true);

        when(userRepository.findByEmail("mathan@example.com")).thenReturn(Optional.of(user));
        when(addressRepository.save(any(UserAddress.class))).thenReturn(manualAddress);

        AddressResponse response = addressService.saveManualAddress("mathan@example.com", request);

        assertNotNull(response);
        assertEquals(101L, response.getId());
        assertEquals("MANUAL", response.getAddressType());
        assertEquals("123", response.getDoorNo());
        assertEquals("Chennai", response.getCity());
        assertTrue(response.getIsDefault());
        verify(userRepository, times(1)).findByEmail("mathan@example.com");
        verify(addressRepository, times(1)).save(any(UserAddress.class));
    }

    @Test
    void saveManualAddress_UserNotFound() {
        AddressRequest request = new AddressRequest();
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> 
            addressService.saveManualAddress("nonexistent@example.com", request)
        );
        verify(addressRepository, never()).save(any(UserAddress.class));
    }

    @Test
    void saveCurrentLocation_Success() {
        LocationRequest request = new LocationRequest(13.0827, 80.2707);

        when(userRepository.findByEmail("mathan@example.com")).thenReturn(Optional.of(user));
        when(addressRepository.save(any(UserAddress.class))).thenReturn(currentLocationAddress);

        AddressResponse response = addressService.saveCurrentLocation("mathan@example.com", request);

        assertNotNull(response);
        assertEquals(102L, response.getId());
        assertEquals("CURRENT_LOCATION", response.getAddressType());
        assertEquals(13.0827, response.getLatitude());
        assertEquals(80.2707, response.getLongitude());
        assertFalse(response.getIsDefault());
        verify(userRepository, times(1)).findByEmail("mathan@example.com");
        verify(addressRepository, times(1)).save(any(UserAddress.class));
    }

    @Test
    void getAddresses_Success() {
        when(userRepository.findByEmail("mathan@example.com")).thenReturn(Optional.of(user));
        when(addressRepository.findByUser(user)).thenReturn(Arrays.asList(manualAddress, currentLocationAddress));

        List<AddressResponse> responses = addressService.getAddresses("mathan@example.com");

        assertNotNull(responses);
        assertEquals(2, responses.size());
        assertEquals(101L, responses.get(0).getId());
        assertEquals(102L, responses.get(1).getId());
        verify(userRepository, times(1)).findByEmail("mathan@example.com");
        verify(addressRepository, times(1)).findByUser(user);
    }
}
