package com.cook2cart.productservice.provider;

import com.cook2cart.productservice.dto.ProductSuggestionDTO;
import com.cook2cart.productservice.enums.ProductSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenFoodFactsProvider implements ProductProvider {

    private final RestTemplate restTemplate;

    @Value("${openfoodfacts.base-url}")
    private String baseUrl;

    @Override
    @SuppressWarnings("unchecked")
    public List<ProductSuggestionDTO> search(String ingredientName) {
        String searchTerm = toPackagedSearchTerm(ingredientName);
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/cgi/search.pl")
                .queryParam("search_terms", searchTerm)
                .queryParam("json", 1)
                .queryParam("page_size", 10)
                .queryParam("fields", "product_name,brands,image_url,code,quantity")
                .toUriString();

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            List<Map<String, Object>> products = response == null
                    ? List.of()
                    : (List<Map<String, Object>>) response.getOrDefault("products", List.of());

            List<ProductSuggestionDTO> suggestions = new ArrayList<>();
            for (Map<String, Object> product : products) {
                String productName = stringValue(product.get("product_name"));
                if (productName.isBlank() || !isRelevantProduct(productName, ingredientName)) {
                    continue;
                }

                suggestions.add(new ProductSuggestionDTO(
                        null,
                        null,
                        null,
                        ingredientName,
                        productName,
                        stringValue(product.get("brands")),
                        stringValue(product.get("image_url")),
                        stringValue(product.get("code")),
                        stringValue(product.get("quantity")),
                        null,
                        null,
                        null,
                        ProductSource.OPEN_FOOD_FACTS
                ));

                if (suggestions.size() == 3) {
                    break;
                }
            }
            return suggestions;
        } catch (Exception ex) {
            log.warn("Open Food Facts lookup failed for ingredient '{}': {}", ingredientName, ex.getMessage());
            return List.of();
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private String toPackagedSearchTerm(String ingredientName) {
        String normalized = normalize(ingredientName);
        return switch (normalized) {
            case "rice" -> "basmati rice";
            case "oil" -> "cooking oil";
            case "flour" -> "wheat flour";
            case "sugar" -> "white sugar";
            case "salt" -> "iodized salt";
            case "butter" -> "butter";
            case "ghee" -> "ghee";
            case "curd" -> "curd";
            case "paneer" -> "paneer";
            case "noodles" -> "noodles";
            case "masala" -> "masala";
            default -> ingredientName;
        };
    }

    private boolean isRelevantProduct(String productName, String ingredientName) {
        String product = normalize(productName);
        String ingredient = normalize(ingredientName);

        if (ingredient.isBlank()) return true;

        return switch (ingredient) {
            case "rice" ->
                    product.contains("rice")
                            && !product.contains("cake")
                            && !product.contains("cakes")
                            && !product.contains("krispies")
                            && !product.contains("cereal")
                            && !product.contains("snack")
                            && !product.contains("meal")
                            && !product.contains("fondue");

            case "oil" ->
                    product.contains("oil")
                            && !product.contains("essential")
                            && !product.contains("hair");

            case "chicken" ->
                    product.contains("chicken")
                            && !product.contains("pizza")
                            && !product.contains("noodles")
                            && !product.contains("ramen")
                            && !product.contains("flavour")
                            && !product.contains("flavor")
                            && !product.contains("soup")
                            && !product.contains("sandwich")
                            && !product.contains("burger")
                            && !product.contains("biryani")
                            && !product.contains("meal");

            default ->
                    product.contains(ingredient);
        };
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
