package com.cook2cart.productservice.provider;

import com.cook2cart.productservice.dto.ProductSuggestionDTO;

import java.util.List;

public interface ProductProvider {
    List<ProductSuggestionDTO> search(String ingredientName);
}
