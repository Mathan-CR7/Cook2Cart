package com.cook2cart.cart_service.service.impl;

import com.cook2cart.cart_service.dto.Cart;
import com.cook2cart.cart_service.dto.CartItem;
import com.cook2cart.cart_service.dto.Ingredient;
import com.cook2cart.cart_service.dto.StoreProduct;
import com.cook2cart.cart_service.service.CartService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;


@Service
public class CartServiceImpl implements CartService {

    private static final Logger log = LoggerFactory.getLogger(CartServiceImpl.class);
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai-service.url:http://localhost:8082}")
    private String aiServiceUrl;



    @Override
    public Cart initializeCart(List<Ingredient> ingredients, int servings) {
        List<Ingredient> processedIngredients = ingredients;
        if (ingredients != null && !ingredients.isEmpty()) {
            try {
                log.info("Calling AI service to parse ingredients dynamically...");
                String url = aiServiceUrl + "/api/ai/recipe/parse-ingredients?servings=" + servings;
                ResponseEntity<Ingredient[]> response = restTemplate.postForEntity(url, ingredients, Ingredient[].class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    processedIngredients = Arrays.asList(response.getBody());
                    log.info("Successfully parsed {} ingredients dynamically using AI service.", processedIngredients.size());
                } else {
                    log.warn("AI service call failed with status: {}. Falling back to local parsing.", response.getStatusCode());
                }
            } catch (Exception e) {
                log.warn("Failed to connect to AI service: {}. Falling back to local parsing.", e.getMessage());
            }
        }

        List<CartItem> items = new ArrayList<>();
        if (processedIngredients != null) {
            for (int i = 0; i < processedIngredients.size(); i++) {
                Ingredient ing = processedIngredients.get(i);
                
                // Retrieve the local cleaned name from the original input list to format regional names correctly
                String rawInputName = (ingredients != null && i < ingredients.size()) ? ingredients.get(i).getName() : ing.getName();
                String localCleanedName = cleanIngredientName(rawInputName);

                String category = ing.getCategory();
                if (category == null || category.isEmpty()) {
                    category = "Other";
                    ing.setCategory(category);
                }
                
                String variety = ing.getVariety();

                // Regional name formatting
                String stdName = ing.getName();
                String originalNameLabel = localCleanedName;
                if (stdName != null && !stdName.isEmpty() && !stdName.equalsIgnoreCase(originalNameLabel)) {
                    originalNameLabel = capitalize(originalNameLabel) + " (" + capitalize(stdName) + ")";
                } else {
                    originalNameLabel = capitalize(originalNameLabel);
                }

                // Handle missing quantities
                Double qty = ing.getQuantity();
                String unit = ing.getUnit();
                if (qty == null || qty == 0.0) {
                    if ("Salt".equalsIgnoreCase(category)) {
                        qty = 100.0;
                        unit = "g";
                    } else if ("Rice".equalsIgnoreCase(category)) {
                        qty = 400.0;
                        unit = "g";
                    } else {
                        qty = 1.0;
                        unit = "unit";
                    }
                }

                // Map dynamic options directly from AI products
                List<StoreProduct> matches = new ArrayList<>();
                if (ing.getProducts() != null && !ing.getProducts().isEmpty()) {
                    for (StoreProduct ap : ing.getProducts()) {
                        String id = ap.getId();
                        if (id == null || id.isEmpty()) {
                            id = "dyn_" + category.toLowerCase() + "_" + ap.getBrand().toLowerCase().replace(" ", "") + "_" + ap.getSize();
                        }
                        double price = ap.getPrice();
                        matches.add(new StoreProduct(id, ap.getName(), ap.getBrand(), ap.getSize(), price, category));
                    }
                }
                
                // Determine the fallback brand dynamically based on category to satisfy the "no Store Brand for packaged products" rule
                String fallbackBrand = "Store Brand";
                if (category != null) {
                    String catLower = category.toLowerCase().trim();
                    boolean isFreshProduce = catLower.contains("onion") || catLower.contains("tomato") || catLower.contains("potato") ||
                                             catLower.contains("brinjal") || catLower.contains("okra") || catLower.contains("coriander") ||
                                             catLower.contains("chilli") || catLower.contains("vegetable") || catLower.contains("fruit") ||
                                             catLower.contains("herb") || catLower.contains("leaf");
                    if (!isFreshProduce && !"other".equals(catLower)) {
                        fallbackBrand = capitalize(category) + " Brand";
                    }
                }

                if (matches.isEmpty()) {
                    matches.add(new StoreProduct("gen_" + ing.getName().toLowerCase(), capitalize(ing.getName()), fallbackBrand, "1 unit", 100.0, category));
                }

                // Pre-select best brand and size matching
                List<String> recs = ing.getRecommendedBrands();
                if (recs == null || recs.isEmpty()) {
                    if (matches != null && !matches.isEmpty()) {
                        recs = matches.stream().map(StoreProduct::getBrand).distinct().collect(Collectors.toList());
                    } else {
                        recs = new ArrayList<>();
                    }
                }

                String preferredBrand = fallbackBrand;
                if (recs != null && !recs.isEmpty()) {
                    preferredBrand = recs.get(0);
                } else if (matches != null && !matches.isEmpty()) {
                    preferredBrand = matches.get(0).getBrand();
                }

                final String finalBrand = preferredBrand;
                List<StoreProduct> brandMatches = matches.stream()
                        .filter(p -> p.getBrand().equals(finalBrand))
                        .collect(Collectors.toList());
                if (brandMatches.isEmpty()) {
                    brandMatches = matches;
                }

                // Filter by variety if present
                if (variety != null && !variety.trim().isEmpty()) {
                    final String finalVariety = variety.toLowerCase().trim();
                    List<StoreProduct> varietyFiltered = brandMatches.stream()
                            .filter(p -> p.getName().toLowerCase().contains(finalVariety))
                            .collect(Collectors.toList());
                    if (!varietyFiltered.isEmpty()) {
                        brandMatches = varietyFiltered;
                    }
                }

                // Filter by name/variety similarity if a specific variety is requested
                List<StoreProduct> varietyMatches = brandMatches.stream()
                        .filter(p -> p.getName().equalsIgnoreCase(ing.getName()) || p.getName().equalsIgnoreCase(stdName))
                        .collect(Collectors.toList());
                if (varietyMatches.isEmpty()) {
                    varietyMatches = brandMatches.stream()
                            .filter(p -> p.getName().toLowerCase().contains(stdName) || stdName.contains(p.getName().toLowerCase()))
                            .collect(Collectors.toList());
                }
                if (!varietyMatches.isEmpty()) {
                    brandMatches = varietyMatches;
                }

                StoreProduct selectedProduct = null;
                double targetWeight = qty;
                double smallestDiff = Double.MAX_VALUE;
                for (StoreProduct p : brandMatches) {
                    double sizeWeight = parseSizeToMetric(p.getSize());
                    if (sizeWeight >= targetWeight) {
                        double diff = sizeWeight - targetWeight;
                        if (diff < smallestDiff) {
                            smallestDiff = diff;
                            selectedProduct = p;
                        }
                    }
                }

                if (selectedProduct == null) {
                    double largestWeight = -1;
                    for (StoreProduct p : brandMatches) {
                        double sizeWeight = parseSizeToMetric(p.getSize());
                        if (sizeWeight > largestWeight) {
                            largestWeight = sizeWeight;
                            selectedProduct = p;
                        }
                    }
                }

                if (selectedProduct == null && !matches.isEmpty()) {
                    selectedProduct = matches.get(0);
                }

                // Brands and Sizes lists
                List<String> availableBrands = matches.stream()
                        .map(StoreProduct::getBrand)
                        .distinct()
                        .collect(Collectors.toList());

                final String selectedName = selectedProduct != null ? selectedProduct.getName() : "";
                final String selectedBrandName = selectedProduct != null ? selectedProduct.getBrand() : "";
                List<String> availableSizes = matches.stream()
                        .filter(p -> p.getName().equals(selectedName) && p.getBrand().equals(selectedBrandName))
                        .map(StoreProduct::getSize)
                        .distinct()
                        .collect(Collectors.toList());

                CartItem item = new CartItem(
                        stdName,
                        originalNameLabel,
                        ing.getRecipeQuantity(),
                        ing.getRecipeUnit(),
                        qty,
                        unit,
                        qty, // base quantity is initial quantity
                        matches,
                        selectedProduct,
                        availableBrands,
                        selectedProduct != null ? selectedProduct.getBrand() : "",
                        availableSizes,
                        selectedProduct != null ? selectedProduct.getSize() : "",
                        selectedProduct != null ? selectedProduct.getPrice() : 0.0,
                        false,
                        recs
                );
                items.add(item);
            }
        }

        Cart cart = new Cart(items, servings, servings, 0.0);
        recalculateTotalPrice(cart);
        return cart;
    }

    @Override
    public Cart scaleCart(Cart cart, int targetServings) {
        if (cart == null) return null;
        double factor = (double) targetServings / cart.getOriginalServings();
        cart.setTargetServings(targetServings);

        if (cart.getItems() != null) {
            for (CartItem item : cart.getItems()) {
                double newQty = item.getBaseQuantity() * factor;
                item.setQuantity(newQty);

                // Auto-update to nearest size that fits scaled quantity for the currently selected product/brand
                if (item.getSelectedProduct() != null) {
                    final String name = item.getSelectedProduct().getName();
                    final String brand = item.getSelectedProduct().getBrand();
                    
                    List<StoreProduct> alternatives = item.getAvailableProducts().stream()
                            .filter(p -> p.getName().equals(name) && p.getBrand().equals(brand))
                            .collect(Collectors.toList());

                    StoreProduct newSelection = null;
                    double smallestDiff = Double.MAX_VALUE;
                    for (StoreProduct p : alternatives) {
                        double sizeWeight = parseSizeToMetric(p.getSize());
                        if (sizeWeight >= newQty) {
                            double diff = sizeWeight - newQty;
                            if (diff < smallestDiff) {
                                smallestDiff = diff;
                                newSelection = p;
                            }
                        }
                    }

                    if (newSelection == null) {
                        double largestWeight = -1;
                        for (StoreProduct p : alternatives) {
                            double sizeWeight = parseSizeToMetric(p.getSize());
                            if (sizeWeight > largestWeight) {
                                largestWeight = sizeWeight;
                                newSelection = p;
                            }
                        }
                    }

                    if (newSelection != null) {
                        item.setSelectedProduct(newSelection);
                        item.setSelectedSize(newSelection.getSize());
                        item.setPrice(newSelection.getPrice());
                    }
                }
            }
        }
        recalculateTotalPrice(cart);
        return cart;
    }

    @Override
    public Cart updateCartItem(Cart cart, int index, String productId, String brand, String size, Boolean availableAtHome) {
        if (cart == null || cart.getItems() == null || index < 0 || index >= cart.getItems().size()) {
            return cart;
        }

        CartItem item = cart.getItems().get(index);
        
        if (availableAtHome != null) {
            item.setAvailableAtHome(availableAtHome);
        }

        if (productId != null) {
            StoreProduct p = item.getAvailableProducts().stream()
                    .filter(prod -> prod.getId().equals(productId))
                    .findFirst().orElse(null);
            if (p != null) {
                item.setSelectedProduct(p);
                item.setSelectedBrand(p.getBrand());
                item.setSelectedSize(p.getSize());
                item.setPrice(p.getPrice());
            }
        } else if (brand != null || size != null) {
            String targetBrand = brand != null ? brand : item.getSelectedBrand();
            String targetSize = size != null ? size : item.getSelectedSize();

            final String prodName = item.getSelectedProduct() != null ? item.getSelectedProduct().getName() : "";
            
            // Find product matching name/variety, brand and size
            StoreProduct match = item.getAvailableProducts().stream()
                    .filter(p -> p.getName().equals(prodName) && p.getBrand().equals(targetBrand) && p.getSize().equals(targetSize))
                    .findFirst().orElse(null);

            // If not found, try brand and size only
            if (match == null) {
                match = item.getAvailableProducts().stream()
                        .filter(p -> p.getBrand().equals(targetBrand) && p.getSize().equals(targetSize))
                        .findFirst().orElse(null);
            }

            // If not found, try brand only (prefer same variety)
            if (match == null) {
                match = item.getAvailableProducts().stream()
                        .filter(p -> p.getName().equals(prodName) && p.getBrand().equals(targetBrand))
                        .findFirst().orElse(null);
            }

            // If not found, try any product matching brand
            if (match == null) {
                match = item.getAvailableProducts().stream()
                        .filter(p -> p.getBrand().equals(targetBrand))
                        .findFirst().orElse(null);
            }

            if (match != null) {
                item.setSelectedProduct(match);
                item.setSelectedBrand(match.getBrand());
                item.setSelectedSize(match.getSize());
                item.setPrice(match.getPrice());
            }
        }

        // Update sizes dropdown list for selected product & brand
        if (item.getSelectedProduct() != null) {
            final String selectedName = item.getSelectedProduct().getName();
            final String selectedBrandName = item.getSelectedProduct().getBrand();
            List<String> availableSizes = item.getAvailableProducts().stream()
                    .filter(p -> p.getName().equals(selectedName) && p.getBrand().equals(selectedBrandName))
                    .map(StoreProduct::getSize)
                    .distinct()
                    .collect(Collectors.toList());
            item.setAvailableSizes(availableSizes);
        }

        recalculateTotalPrice(cart);
        return cart;
    }

    @Override
    public Cart updateLatestPrices(Cart cart) {
        if (cart == null || cart.getItems() == null) return cart;

        List<StoreProduct> currentProducts = new ArrayList<>();
        for (CartItem item : cart.getItems()) {
            if (item.getSelectedProduct() != null) {
                currentProducts.add(item.getSelectedProduct());
            }
        }

        if (!currentProducts.isEmpty()) {
            try {
                log.info("Calling AI service to update latest prices dynamically...");
                String url = aiServiceUrl + "/api/ai/recipe/update-prices";
                ResponseEntity<StoreProduct[]> response = restTemplate.postForEntity(url, currentProducts, StoreProduct[].class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    List<StoreProduct> updatedProducts = Arrays.asList(response.getBody());
                    Map<String, Double> priceMap = new HashMap<>();
                    for (StoreProduct p : updatedProducts) {
                        if (p.getId() != null) {
                            priceMap.put(p.getId(), p.getPrice());
                        }
                    }

                    for (CartItem item : cart.getItems()) {
                        if (item.getSelectedProduct() != null) {
                            Double newPrice = priceMap.get(item.getSelectedProduct().getId());
                            if (newPrice != null) {
                                item.getSelectedProduct().setPrice(newPrice);
                                item.setPrice(newPrice);
                            }
                        }
                    }
                } else {
                    log.warn("AI service call failed for price updates with status: {}. Falling back to local simulation.", response.getStatusCode());
                    applyFallbackPriceFluctuations(cart);
                }
            } catch (Exception e) {
                log.warn("Failed to connect to AI service for price updates: {}. Falling back to local simulation.", e.getMessage());
                applyFallbackPriceFluctuations(cart);
            }
        }

        recalculateTotalPrice(cart);
        return cart;
    }

    private void applyFallbackPriceFluctuations(Cart cart) {
        for (CartItem item : cart.getItems()) {
            if (item.getSelectedProduct() != null) {
                double currentPrice = item.getSelectedProduct().getPrice();
                double newPrice = Math.round(currentPrice * 1.05 * 100.0) / 100.0;
                item.getSelectedProduct().setPrice(newPrice);
                item.setPrice(newPrice);
            }
        }
    }

    @Override
    public Cart removeCartItem(Cart cart, int index) {
        if (cart == null || cart.getItems() == null || index < 0 || index >= cart.getItems().size()) {
            return cart;
        }
        cart.getItems().remove(index);
        recalculateTotalPrice(cart);
        return cart;
    }

    private void recalculateTotalPrice(Cart cart) {
        double total = 0.0;
        if (cart.getItems() != null) {
            for (CartItem item : cart.getItems()) {
                if (!item.isAvailableAtHome()) {
                    total += item.getPrice();
                }
            }
        }
        cart.setTotalPrice(Math.round(total * 100.0) / 100.0);
    }



    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return "";
        return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
    }

    private double parseSizeToMetric(String size) {
        if (size == null) return 0;
        String lower = size.toLowerCase().trim();
        if (lower.endsWith("kg")) {
            return Double.parseDouble(lower.replace("kg", "")) * 1000;
        }
        if (lower.endsWith("g")) {
            return Double.parseDouble(lower.replace("g", ""));
        }
        if (lower.endsWith("ml")) {
            return Double.parseDouble(lower.replace("ml", ""));
        }
        if (lower.endsWith("l")) {
            return Double.parseDouble(lower.replace("l", "")) * 1000;
        }
        if (lower.endsWith("pcs") || lower.endsWith("pieces") || lower.endsWith("piece") || lower.endsWith("units") || lower.endsWith("unit") || lower.endsWith("bunch") || lower.endsWith("bunches")) {
            String val = lower.replaceAll("[a-z\\s]", "");
            if (val.isEmpty()) return 1.0;
            try {
                return Double.parseDouble(val);
            } catch (NumberFormatException e) {
                return 1.0;
            }
        }
        return 1.0;
    }

    private String cleanIngredientName(String rawName) {
        if (rawName == null) return "";
        String name = rawName.toLowerCase().trim();
        name = name.replaceAll("^(?i)(\\d+(?:\\.\\d+)?|\\d+/\\d+|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|three quarters|some|little|a)\\s*(cups?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|tablespoons?|tbsp|teaspoons?|tsp|pieces?|pcs|pinch|handfuls?|unit|units|oz|ounces?|cloves?|bunches?|bunch)?s?\\s+", "");
        List<String> wordsToRemove = Arrays.asList(
            "chopped", "minced", "diced", "sliced", "grated", "peeled", "crushed", "roasted", 
            "ground", "fried", "boiled", "cooked", "required", "to taste", "fine", "finely", "fresh", "cut", "prepared"
        );
        for (String word : wordsToRemove) {
            name = name.replace(word, "").trim();
        }
        return name.trim();
    }
}
