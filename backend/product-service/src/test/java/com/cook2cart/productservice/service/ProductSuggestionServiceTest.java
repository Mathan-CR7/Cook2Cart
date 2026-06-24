package com.cook2cart.productservice.service;

import com.cook2cart.productservice.config.RecipeServiceClient;
import com.cook2cart.productservice.dto.IngredientProductSuggestionsDTO;
import com.cook2cart.productservice.dto.ProductSuggestionDTO;
import com.cook2cart.productservice.dto.RecipeIngredientDTO;
import com.cook2cart.productservice.entity.ProductSuggestion;
import com.cook2cart.productservice.enums.ProductSource;
import com.cook2cart.productservice.exception.ResourceNotFoundException;
import com.cook2cart.productservice.provider.AgmarknetProvider;
import com.cook2cart.productservice.provider.AmazonRapidApiProvider;
import com.cook2cart.productservice.provider.InternalProductProvider;
import com.cook2cart.productservice.repository.ProductSuggestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductSuggestionServiceTest {

    @Mock
    private ProductSuggestionRepository productSuggestionRepository;

    @Mock
    private RecipeServiceClient recipeServiceClient;

    @Mock
    private AmazonRapidApiProvider amazonRapidApiProvider;

    @Mock
    private AgmarknetProvider agmarknetProvider;

    @Mock
    private InternalProductProvider internalProductProvider;

    @InjectMocks
    private ProductSuggestionService productSuggestionService;

    private RecipeIngredientDTO onionIngredient;
    private RecipeIngredientDTO oilIngredient;
    private ProductSuggestionDTO onionSuggestion;
    private ProductSuggestionDTO oilSuggestion;
    private ProductSuggestion onionEntity;
    private ProductSuggestion oilEntity;

    @BeforeEach
    void setUp() {
        onionIngredient = new RecipeIngredientDTO(10L, 1L, "onion", 2.0, "pcs", 100.0, "g", false, "speech", 0.95);
        oilIngredient = new RecipeIngredientDTO(11L, 1L, "cooking oil", 1.0, "tbsp", 15.0, "ml", false, "speech", 0.95);

        onionSuggestion = new ProductSuggestionDTO(
                101L, 1L, 10L, "onion", "Fresh Onion", "Store Brand",
                "img_url", "bar_1", "500g", new BigDecimal("30.0"), "INR", "Market", ProductSource.AGMARKNET
        );

        oilSuggestion = new ProductSuggestionDTO(
                102L, 1L, 11L, "cooking oil", "Fortune Cooking Oil", "Fortune",
                "img_url", "bar_2", "1L", new BigDecimal("150.0"), "INR", "Market", ProductSource.AMAZON
        );

        onionEntity = ProductSuggestion.builder()
                .id(101L)
                .recipeId(1L)
                .recipeIngredientId(10L)
                .productName("Fresh Onion")
                .brandName("Store Brand")
                .imageUrl("img_url")
                .barcode("bar_1")
                .packQuantity("500g")
                .marketPrice(new BigDecimal("30.0"))
                .priceUnit("INR")
                .marketName("Market")
                .source(ProductSource.AGMARKNET)
                .build();

        oilEntity = ProductSuggestion.builder()
                .id(102L)
                .recipeId(1L)
                .recipeIngredientId(11L)
                .productName("Fortune Cooking Oil")
                .brandName("Fortune")
                .imageUrl("img_url")
                .barcode("bar_2")
                .packQuantity("1L")
                .marketPrice(new BigDecimal("150.0"))
                .priceUnit("INR")
                .marketName("Market")
                .source(ProductSource.AMAZON)
                .build();
    }

    @Test
    void generateSuggestions_Success() {
        when(recipeServiceClient.getRecipeIngredients(1L))
                .thenReturn(Arrays.asList(onionIngredient, oilIngredient));
        
        // SelectProvider targets: raw commodity "onion" -> agmarknetProvider; packaged "oil" -> amazonRapidApiProvider
        when(agmarknetProvider.search("onion")).thenReturn(Collections.singletonList(onionSuggestion));
        when(amazonRapidApiProvider.search("cooking oil")).thenReturn(Collections.singletonList(oilSuggestion));

        when(productSuggestionRepository.save(any(ProductSuggestion.class)))
                .thenAnswer(invocation -> {
                    ProductSuggestion entity = invocation.getArgument(0);
                    if (entity.getRecipeIngredientId() == 10L) {
                        return onionEntity;
                    } else {
                        return oilEntity;
                    }
                });

        List<IngredientProductSuggestionsDTO> results = productSuggestionService.generateSuggestions(1L);

        assertNotNull(results);
        assertEquals(2, results.size());
        
        IngredientProductSuggestionsDTO onionGroup = results.get(0);
        assertEquals(10L, onionGroup.recipeIngredientId());
        assertEquals("onion", onionGroup.ingredientName());
        assertEquals(1, onionGroup.suggestions().size());
        assertEquals("Fresh Onion", onionGroup.suggestions().get(0).productName());

        IngredientProductSuggestionsDTO oilGroup = results.get(1);
        assertEquals(11L, oilGroup.recipeIngredientId());
        assertEquals("cooking oil", oilGroup.ingredientName());
        assertEquals(1, oilGroup.suggestions().size());
        assertEquals("Fortune Cooking Oil", oilGroup.suggestions().get(0).productName());

        verify(recipeServiceClient, times(1)).getRecipeIngredients(1L);
        verify(productSuggestionRepository, times(1)).deleteByRecipeId(1L);
        verify(productSuggestionRepository, times(2)).save(any(ProductSuggestion.class));
    }

    @Test
    void generateSuggestions_NoIngredients_ThrowsException() {
        when(recipeServiceClient.getRecipeIngredients(1L)).thenReturn(Collections.emptyList());

        assertThrows(ResourceNotFoundException.class, () -> 
            productSuggestionService.generateSuggestions(1L)
        );

        verify(productSuggestionRepository, never()).deleteByRecipeId(anyLong());
        verify(productSuggestionRepository, never()).save(any(ProductSuggestion.class));
    }

    @Test
    void getSuggestionsByRecipe_Success() {
        when(productSuggestionRepository.findByRecipeIdOrderByRecipeIngredientIdAscCreatedAtDesc(1L))
                .thenReturn(Arrays.asList(onionEntity, oilEntity));
        when(recipeServiceClient.getRecipeIngredients(1L))
                .thenReturn(Arrays.asList(onionIngredient, oilIngredient));

        List<IngredientProductSuggestionsDTO> results = productSuggestionService.getSuggestionsByRecipe(1L);

        assertNotNull(results);
        assertEquals(2, results.size());
        assertEquals(10L, results.get(0).recipeIngredientId());
        assertEquals("onion", results.get(0).ingredientName());
        assertEquals(11L, results.get(1).recipeIngredientId());
        assertEquals("cooking oil", results.get(1).ingredientName());
        verify(productSuggestionRepository, times(1)).findByRecipeIdOrderByRecipeIngredientIdAscCreatedAtDesc(1L);
    }
}
