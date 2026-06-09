package com.cook2cart.productservice.provider;

import com.cook2cart.productservice.dto.ProductSuggestionDTO;
import com.cook2cart.productservice.enums.ProductSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class AmazonRapidApiProvider implements ProductProvider {

    private final RestTemplate restTemplate;

    @Value("${amazon.api.base-url}")
    private String baseUrl;

    @Value("${amazon.api.host}")
    private String host;

    @Value("${amazon.api.key}")
    private String apiKey;

    @Override
    @SuppressWarnings("unchecked")
    public List<ProductSuggestionDTO> search(String ingredientName) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("amazon.api.key is not configured. Skipping Amazon lookup for '{}'", ingredientName);
            return List.of();
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/search")
                .queryParam("query", toAmazonSearchTerm(ingredientName))
                .queryParam("page", 1)
                .queryParam("country", "IN")
                .queryParam("sort_by", "RELEVANCE")
                .queryParam("product_condition", "ALL")
                .queryParam("is_prime", false)
                .queryParam("deals_and_discounts", "NONE")
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-rapidapi-host", host);
        headers.set("x-rapidapi-key", apiKey);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<String, Object> body = response.getBody();
            Map<String, Object> data = body == null ? Map.of() : (Map<String, Object>) body.getOrDefault("data", Map.of());
            List<Map<String, Object>> products = (List<Map<String, Object>>) data.getOrDefault("products", List.of());

            List<ProductSuggestionDTO> suggestions = new ArrayList<>();
            for (Map<String, Object> product : products) {
                String productName = firstNonBlank(
                        stringValue(product.get("product_title")),
                        stringValue(product.get("title")),
                        stringValue(product.get("name"))
                );
                if (productName.isBlank() || !isRelevantProduct(productName, ingredientName)) {
                    continue;
                }

                suggestions.add(new ProductSuggestionDTO(
                        null,
                        null,
                        null,
                        ingredientName,
                        productName,
                        stringValue(product.get("product_byline")),
                        stringValue(product.get("product_photo")),
                        stringValue(product.get("asin")),
                        extractPackQuantity(productName),
                        parsePrice(product.get("product_price")),
                        "INR",
                        null,
                        ProductSource.AMAZON
                ));

                if (suggestions.size() == 3) {
                    break;
                }
            }
            return suggestions;
        } catch (Exception ex) {
            log.warn("Amazon RapidAPI lookup failed for ingredient '{}': {}", ingredientName, ex.getMessage());
            return List.of();
        }
    }

    private String toAmazonSearchTerm(String ingredientName) {
        String normalized = normalize(ingredientName);
        return switch (normalized) {
            case "rice" -> "basmati rice grocery";
            case "oil" -> "cooking oil grocery";
            case "flour" -> "wheat flour grocery";
            case "sugar" -> "sugar grocery";
            case "salt" -> "salt grocery";
            case "butter" -> "butter grocery";
            case "ghee" -> "ghee grocery";
            case "curd" -> "curd grocery";
            case "paneer" -> "paneer grocery";
            case "noodles" -> "noodles grocery";
            case "masala" -> "masala powder grocery";
            default -> ingredientName + " grocery";
        };
    }

    private boolean isRelevantProduct(String productName, String ingredientName) {
        String product = normalize(productName);
        String ingredient = normalize(ingredientName);
        return ingredient.isBlank() || product.contains(ingredient) || product.contains(toMainToken(ingredient));
    }

    private String toMainToken(String value) {
        String normalized = normalize(value);
        int firstSpace = normalized.indexOf(' ');
        return firstSpace < 0 ? normalized : normalized.substring(0, firstSpace);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private BigDecimal parsePrice(Object value) {
        if (value == null) {
            return null;
        }
        String numeric = value.toString().replaceAll("[^0-9.]", "");
        if (numeric.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(numeric);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String extractPackQuantity(String productName) {
        Pattern pattern = Pattern.compile("\\b\\d+(?:\\.\\d+)?\\s?(kg|g|gram|grams|l|ml|litre|liter|pack|pcs|pieces)\\b", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(productName);
        return matcher.find() ? matcher.group() : null;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
