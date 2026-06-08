package com.cook2cart.user_service.dto;


import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AddressRequest {

    private String doorNo;
    private String street;
    private String city;
    private String state;
    private String pincode;
    private Boolean isDefault;
}
