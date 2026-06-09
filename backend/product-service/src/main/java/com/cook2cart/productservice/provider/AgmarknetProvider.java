package com.cook2cart.productservice.provider;

import com.cook2cart.productservice.dto.ProductSuggestionDTO;
import com.cook2cart.productservice.enums.ProductSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgmarknetProvider implements ProductProvider {

    private final RestTemplate restTemplate;

    @Value("${agmarknet.base-url}")
    private String baseUrl;

    @Value("${agmarknet.api-key}")
    private String apiKey;

    @Override
    @SuppressWarnings("unchecked")
    public List<ProductSuggestionDTO> search(String ingredientName) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("AGMARKNET_API_KEY is not configured. Skipping AGMARKNET lookup for '{}'", ingredientName);
            return List.of();
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl)
                .queryParam("api-key", apiKey)
                .queryParam("format", "json")
                .queryParam("limit", 10)
                .queryParam("filters[commodity]", ingredientName)
                .toUriString();

        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            List<Map<String, Object>> records = response == null
                    ? List.of()
                    : (List<Map<String, Object>>) response.getOrDefault("records", List.of());

            List<ProductSuggestionDTO> suggestions = new ArrayList<>();
            for (Map<String, Object> record : records) {
                String commodity = firstNonBlank(stringValue(record.get("commodity")), ingredientName);
                if (!isMatchingCommodity(commodity, ingredientName)) {
                    continue;
                }

                String market = stringValue(record.get("market"));
                String district = stringValue(record.get("district"));
                String state = stringValue(record.get("state"));
                String marketName = joinMarketName(market, district, state);

                suggestions.add(new ProductSuggestionDTO(
                        null,
                        null,
                        null,
                        ingredientName,
                        commodity,
                        null,
                        null,
                        null,
                        null,
                        parsePrice(record.get("modal_price")),
                        "INR/quintal",
                        marketName,
                        ProductSource.AGMARKNET
                ));

                if (suggestions.size() == 3) {
                    break;
                }
            }
            return suggestions;
        } catch (Exception ex) {
            log.warn("AGMARKNET lookup failed for ingredient '{}': {}", ingredientName, ex.getMessage());
            return List.of();
        }
    }

    private BigDecimal parsePrice(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(value.toString().replace(",", "").trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String joinMarketName(String market, String district, String state) {
        return List.of(market, district, state).stream()
                .filter(item -> item != null && !item.isBlank())
                .reduce((left, right) -> left + ", " + right)
                .orElse(null);
    }

    private String firstNonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private boolean isMatchingCommodity(String commodity, String ingredientName) {
        String normalizedCommodity = normalize(commodity);
        String normalizedIngredient = normalize(ingredientName);
        return normalizedCommodity.equals(normalizedIngredient)
                || normalizedCommodity.contains(normalizedIngredient)
                || normalizedIngredient.contains(normalizedCommodity);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
