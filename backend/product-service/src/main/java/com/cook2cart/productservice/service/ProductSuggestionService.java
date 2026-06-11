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
import com.cook2cart.productservice.provider.ProductProvider;
import com.cook2cart.productservice.repository.ProductSuggestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductSuggestionService {

    private static final Set<String> PACKAGED_INGREDIENTS = Set.of(
            "rice", "oil", "milk", "flour", "sugar", "salt", "butter", "ghee",
            "curd", "paneer", "noodles", "masala"
    );

    private static final Set<String> RAW_COMMODITIES = Set.of(
            "tomato", "onion", "potato", "carrot", "beans", "chilli",
            "coriander", "curry leaves", "garlic", "ginger"
    );

    private final ProductSuggestionRepository productSuggestionRepository;
    private final RecipeServiceClient recipeServiceClient;
    private final AmazonRapidApiProvider amazonRapidApiProvider;
    private final AgmarknetProvider agmarknetProvider;
    private final InternalProductProvider internalProductProvider;

    @Transactional
    public List<IngredientProductSuggestionsDTO> generateSuggestions(Long recipeId) {
        log.info("Generating product suggestions for recipeId={}", recipeId);

        List<RecipeIngredientDTO> ingredients = recipeServiceClient.getRecipeIngredients(recipeId);
        if (ingredients == null || ingredients.isEmpty()) {
            throw new ResourceNotFoundException("No ingredients found for recipeId=" + recipeId);
        }

        productSuggestionRepository.deleteByRecipeId(recipeId);

        List<ProductSuggestion> savedSuggestions = new ArrayList<>();
        for (RecipeIngredientDTO ingredient : ingredients) {
            if (ingredient.ingredientName() == null || ingredient.ingredientName().isBlank()) {
                continue;
            }

            ProductProvider provider = selectProvider(ingredient.ingredientName());
            List<ProductSuggestionDTO> suggestions = provider.search(ingredient.ingredientName());
            if (suggestions.isEmpty()) {
                log.warn("Using internal fallback products for ingredient '{}'", ingredient.ingredientName());
                suggestions = internalProductProvider.search(ingredient.ingredientName());
            }

            for (ProductSuggestionDTO suggestion : suggestions) {
                savedSuggestions.add(productSuggestionRepository.save(toEntity(recipeId, ingredient, suggestion)));
            }
        }

        return groupByIngredient(savedSuggestions, ingredients);
    }

    @Transactional(readOnly = true)
    public List<IngredientProductSuggestionsDTO> getSuggestionsByRecipe(Long recipeId) {
        List<ProductSuggestion> suggestions = productSuggestionRepository.findByRecipeIdOrderByRecipeIngredientIdAscCreatedAtDesc(recipeId);
        if (suggestions.isEmpty()) {
            return List.of();
        }

        Map<Long, String> ingredientNames = new HashMap<>();
        try {
            List<RecipeIngredientDTO> ingredients = recipeServiceClient.getRecipeIngredients(recipeId);
            if (ingredients != null) {
                ingredients.forEach(item -> ingredientNames.put(item.id(), item.ingredientName()));
            }
        } catch (Exception ex) {
            log.warn("Could not load ingredient names for saved suggestions. recipeId={}", recipeId, ex);
        }

        return groupByIngredient(suggestions, ingredientNames);
    }

    private ProductProvider selectProvider(String ingredientName) {
        String normalized = normalize(ingredientName);

        if (RAW_COMMODITIES.stream().anyMatch(normalized::contains)) {
            return agmarknetProvider;
        }
        if (PACKAGED_INGREDIENTS.stream().anyMatch(normalized::contains)) {
            return amazonRapidApiProvider;
        }

        return amazonRapidApiProvider;
    }

    private ProductSuggestion toEntity(Long recipeId, RecipeIngredientDTO ingredient, ProductSuggestionDTO suggestion) {
        return ProductSuggestion.builder()
                .recipeId(recipeId)
                .recipeIngredientId(ingredient.id())
                .source(suggestion.source())
                .productName(suggestion.productName())
                .brandName(suggestion.brandName())
                .imageUrl(suggestion.imageUrl())
                .barcode(suggestion.barcode())
                .packQuantity(suggestion.packQuantity())
                .marketPrice(suggestion.marketPrice())
                .priceUnit(suggestion.priceUnit())
                .marketName(suggestion.marketName())
                .build();
    }

    private List<IngredientProductSuggestionsDTO> groupByIngredient(
            List<ProductSuggestion> suggestions,
            List<RecipeIngredientDTO> ingredients
    ) {
        Map<Long, String> ingredientNames = new HashMap<>();
        ingredients.forEach(item -> ingredientNames.put(item.id(), item.ingredientName()));
        return groupByIngredient(suggestions, ingredientNames);
    }

    private List<IngredientProductSuggestionsDTO> groupByIngredient(
            List<ProductSuggestion> suggestions,
            Map<Long, String> ingredientNames
    ) {
        Map<Long, List<ProductSuggestionDTO>> grouped = new LinkedHashMap<>();
        suggestions.forEach(item -> grouped
                .computeIfAbsent(item.getRecipeIngredientId(), ignored -> new ArrayList<>())
                .add(toDTO(item, ingredientNames.get(item.getRecipeIngredientId()))));

        return grouped.entrySet().stream()
                .map(entry -> new IngredientProductSuggestionsDTO(
                        entry.getKey(),
                        ingredientNames.get(entry.getKey()),
                        entry.getValue()
                ))
                .toList();
    }

    private ProductSuggestionDTO toDTO(ProductSuggestion item, String ingredientName) {
        return new ProductSuggestionDTO(
                item.getId(),
                item.getRecipeId(),
                item.getRecipeIngredientId(),
                ingredientName,
                item.getProductName(),
                item.getBrandName(),
                item.getImageUrl(),
                item.getBarcode(),
                item.getPackQuantity(),
                item.getMarketPrice(),
                item.getPriceUnit(),
                item.getMarketName(),
                item.getSource() == null ? ProductSource.AMAZON : item.getSource()
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
