package com.cook2cart.user_service.dto;


import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LocationRequest {

    private Double latitude;
    private Double longitude;
}