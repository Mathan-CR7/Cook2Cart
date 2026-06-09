package com.cook2cart.productservice.provider;

import com.cook2cart.productservice.dto.ProductSuggestionDTO;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BlinkitProvider implements ProductProvider {

    @Override
    public List<ProductSuggestionDTO> search(String ingredientName) {
        return List.of();
    }
}
