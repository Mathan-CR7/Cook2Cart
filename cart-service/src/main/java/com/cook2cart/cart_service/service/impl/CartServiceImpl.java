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

        if (processedIngredients != null) {
            for (Ingredient ing : processedIngredients) {
                enrichIngredient(ing);
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

    private void enrichIngredient(Ingredient ing) {
        if (ing == null) return;
        
        if (ing.getCategory() == null || ing.getCategory().isEmpty()) {
            ing.setCategory(detectCategory(ing.getName()));
        }
        
        if (ing.getVariety() == null || ing.getVariety().isEmpty()) {
            ing.setVariety(detectVariety(ing.getName()));
        }
        
        if (ing.getRecommendedBrands() == null || ing.getRecommendedBrands().isEmpty()) {
            ing.setRecommendedBrands(detectBrands(ing.getCategory(), ing.getName()));
        }
        
        if (ing.getRecommendedPackSizes() == null || ing.getRecommendedPackSizes().isEmpty()) {
            ing.setRecommendedPackSizes(detectPackSizes(ing.getCategory(), ing.getVariety(), ing.getName()));
        }
        
        if (ing.getProducts() == null || ing.getProducts().isEmpty()) {
            List<StoreProduct> prodOpts = new ArrayList<>();
            List<String> productNames = getCategoryProductNames(ing.getCategory());
            for (String pName : productNames) {
                for (String b : ing.getRecommendedBrands()) {
                    for (String s : ing.getRecommendedPackSizes()) {
                        double price = estimateFallbackPrice(ing.getCategory(), b, s, pName);
                        String id = ing.getCategory().toLowerCase().replace(" ", "_") + "_" + (prodOpts.size() + 1);
                        prodOpts.add(new StoreProduct(id, pName, b, s, price, ing.getCategory()));
                    }
                }
            }
            ing.setProducts(prodOpts);
        }
    }

    private List<String> getCategoryProductNames(String category) {
        if (category == null) return Collections.emptyList();
        String cat = category.toLowerCase().trim();
        switch (cat) {
            case "rice":
                return Arrays.asList("Basmati Rice", "Sona Masoori Rice", "Ponni Rice", "Brown Rice", "Raw Rice", "Idli Rice", "Jeera Samba Rice", "Matta Rice", "Rice");
            case "atta":
                return Collections.singletonList("Atta");
            case "salt":
                return Collections.singletonList("Salt");
            case "onion":
                return Arrays.asList("Onion", "Small Onion", "Big Onion");
            case "tomato":
                return Arrays.asList("Tomato", "Nattu Tomato", "Ponda Tomato");
            case "potato":
                return Collections.singletonList("Potato");
            case "brinjal":
                return Collections.singletonList("Eggplant");
            case "okra":
                return Arrays.asList("Okra", "Lady Finger");
            case "coriander leaves":
                return Arrays.asList("Cilantro", "Coriander Leaves");
            case "oil":
                return Collections.singletonList("Cooking Oil");
            case "chicken":
                return Arrays.asList("Fresh Chicken", "Fresh Chicken Legs");
            case "milk":
                return Collections.singletonList("Fresh Milk");
            case "curd":
                return Collections.singletonList("Fresh Curd");
            case "sugar":
                return Collections.singletonList("Sugar");
            case "ghee":
                return Collections.singletonList("Pure Ghee");
            case "ginger garlic paste":
                return Collections.singletonList("Ginger Garlic Paste");
            case "biryani masala":
                return Collections.singletonList("Biryani Masala");
            case "spices":
                return Arrays.asList("Garam Masala", "Turmeric Powder", "Chilli Powder", "Sambar Powder");
            default:
                return Collections.singletonList(category);
        }
    }

    private double estimateFallbackPrice(String category, String brand, String size, String productName) {
        if (category == null || brand == null || size == null || productName == null) return 50.0;
        String cat = category.toLowerCase().trim();
        String b = brand.toLowerCase().trim();
        String s = size.toLowerCase().trim();
        String pName = productName.toLowerCase().trim();

        if (cat.contains("rice")) {
            if (pName.contains("basmati")) {
                if (b.contains("india gate")) {
                    if (s.equals("1kg")) return 140.0;
                    if (s.equals("5kg")) return 680.0;
                }
                if (b.contains("daawat") && s.equals("1kg")) return 130.0;
                if (b.contains("fortune") && s.equals("1kg")) return 125.0;
            }
            if (pName.contains("sona masoori")) {
                if (b.contains("fortune") && s.equals("1kg")) return 65.0;
                if (b.contains("aashirvaad") && s.equals("1kg")) return 70.0;
            }
            if (pName.contains("ponni") && b.contains("ponni") && s.equals("1kg")) return 55.0;
            if (pName.contains("brown") && b.contains("24 mantra") && s.equals("1kg")) return 90.0;
            if (pName.contains("raw") && b.contains("store") && s.equals("1kg")) return 50.0;
            if (pName.contains("idli") && b.contains("local") && s.equals("1kg")) return 45.0;
            if (pName.contains("jeera") && b.contains("local") && s.equals("1kg")) return 95.0;
            if (pName.contains("matta") && b.contains("double") && s.equals("1kg")) return 80.0;
            if (pName.equals("rice") && b.contains("store")) {
                if (s.equals("1kg")) return 55.0;
                if (s.equals("5kg")) return 250.0;
                if (s.equals("10kg")) return 480.0;
            }
        }
        
        if (cat.contains("atta")) {
            if (b.contains("aashirvaad")) {
                if (s.equals("1kg")) return 60.0;
                if (s.equals("5kg")) return 270.0;
            }
            if (b.contains("pillsbury")) {
                if (s.equals("1kg")) return 65.0;
                if (s.equals("5kg")) return 290.0;
            }
            if (b.contains("annapurna") && s.equals("1kg")) return 58.0;
            if (b.contains("store") && s.equals("1kg")) return 50.0;
        }
        
        if (cat.contains("salt")) {
            if (b.contains("tata")) {
                if (s.equals("100g")) return 10.0;
                if (s.equals("500g")) return 20.0;
                if (s.equals("1kg")) return 30.0;
            }
            if (b.contains("store") && s.equals("1kg")) return 25.0;
        }
        
        if (cat.contains("onion")) {
            if (pName.equals("onion")) {
                if (s.equals("500g")) return 25.0;
                if (s.equals("1kg")) return 45.0;
            }
            if (pName.contains("small") && s.equals("500g")) return 40.0;
            if (pName.contains("big") && s.equals("500g")) return 25.0;
        }
        
        if (cat.contains("tomato")) {
            if (pName.equals("tomato")) {
                if (s.equals("500g")) return 30.0;
                if (s.equals("1kg")) return 55.0;
            }
            if (pName.contains("nattu") && s.equals("500g")) return 35.0;
            if (pName.contains("ponda") && s.equals("500g")) return 30.0;
        }
        
        if (cat.contains("potato") && b.contains("store") && s.equals("1kg")) return 40.0;
        
        if (cat.contains("brinjal") || cat.contains("eggplant")) {
            if (s.equals("500g")) return 40.0;
            if (s.equals("1kg")) return 75.0;
            if (s.equals("1 piece")) return 15.0;
            if (s.equals("4 pcs")) return 55.0;
        }
        
        if (cat.contains("okra") || cat.contains("lady")) {
            if (pName.contains("okra")) {
                if (s.equals("500g")) return 35.0;
                if (s.equals("1kg")) return 65.0;
                if (s.equals("10 pcs")) return 10.0;
                if (s.equals("30 pcs")) return 25.0;
            }
            if (pName.contains("lady")) {
                if (s.equals("500g")) return 35.0;
                if (s.equals("1kg")) return 65.0;
            }
        }
        
        if (cat.contains("coriander") || cat.contains("cilantro")) {
            if (s.equals("100g")) return 15.0;
            if (s.equals("250g")) return 30.0;
            if (s.equals("1 bunch")) return 10.0;
            if (s.equals("3 bunches")) return 25.0;
        }
        
        if (cat.contains("green chilli") && s.equals("100g")) return 15.0;
        
        if (cat.contains("oil")) {
            if (b.contains("fortune")) {
                if (s.equals("500ml")) return 80.0;
                if (s.equals("1l")) return 150.0;
                if (s.equals("5l")) return 700.0;
            }
        }
        
        if (cat.contains("chicken")) {
            if (b.contains("suguna")) {
                if (s.equals("500g")) return 130.0;
                if (s.equals("1kg")) return 250.0;
                if (s.equals("4 pcs") || pName.contains("legs")) return 180.0;
            }
        }
        
        if (cat.contains("milk")) {
            if (s.equals("1l")) {
                if (b.contains("amul")) return 68.0;
                if (b.contains("aavin")) return 62.0;
                if (b.contains("nandini")) return 60.0;
            }
            if (s.equals("500ml") && b.contains("heritage")) return 35.0;
        }
        
        if (cat.contains("curd")) {
            if (s.equals("500g")) {
                if (b.contains("aavin")) return 38.0;
                if (b.contains("amul")) return 42.0;
            }
        }
        
        if (cat.contains("sugar")) {
            if (s.equals("1kg")) {
                if (b.contains("madhur")) return 45.0;
                if (b.contains("trust")) return 50.0;
                if (b.contains("dhampure")) return 52.0;
            }
        }
        
        if (cat.contains("ghee")) {
            if (s.equals("200ml")) {
                if (b.contains("amul")) return 145.0;
                if (b.contains("aashirvaad")) return 155.0;
            }
        }
        
        if (cat.contains("ginger garlic") && b.contains("aachi") && s.equals("100g")) return 20.0;
        if (cat.contains("biryani masala") && b.contains("aachi") && s.equals("50g")) return 25.0;

        double qty = 500.0;
        String sLower = s.toLowerCase();
        if (sLower.endsWith("kg")) {
            try { qty = Double.parseDouble(sLower.replace("kg", "")) * 1000.0; } catch (Exception e) {}
        } else if (sLower.endsWith("g")) {
            try { qty = Double.parseDouble(sLower.replace("g", "")); } catch (Exception e) {}
        } else if (sLower.endsWith("ml")) {
            try { qty = Double.parseDouble(sLower.replace("ml", "")); } catch (Exception e) {}
        } else if (sLower.endsWith("l")) {
            try { qty = Double.parseDouble(sLower.replace("l", "")) * 1000.0; } catch (Exception e) {}
        }
        
        double pricePerUnit = 0.05;
        if (cat.contains("rice")) pricePerUnit = 0.08;
        else if (cat.contains("atta")) pricePerUnit = 0.06;
        else if (cat.contains("salt")) pricePerUnit = 0.03;
        else if (cat.contains("ghee")) pricePerUnit = 0.75;
        else if (cat.contains("oil")) pricePerUnit = 0.15;
        else if (cat.contains("sugar")) pricePerUnit = 0.045;
        else if (cat.contains("milk")) pricePerUnit = 0.065;
        else if (cat.contains("curd")) pricePerUnit = 0.08;
        else if (cat.contains("spice") || cat.contains("masala")) pricePerUnit = 0.50;
        else if (cat.contains("chicken")) pricePerUnit = 0.25;
        else if (cat.contains("onion") || cat.contains("tomato") || cat.contains("potato")) pricePerUnit = 0.06;
        
        double estPrice = qty * pricePerUnit;
        if (!"store brand".equals(b)) {
            estPrice *= 1.1;
        }
        return Math.round(estPrice * 2.0) / 2.0;
    }

    private List<String> detectBrands(String category, String name) {
        if (category == null) return Collections.singletonList("Store Brand");
        String cat = category.toLowerCase().trim();
        String lowerName = name != null ? name.toLowerCase().trim() : "";
        
        List<String> storeBrandOnlyList = Arrays.asList(
            "tomato", "onion", "potato", "brinjal", "eggplant", "carrot", "beetroot", 
            "cabbage", "cauliflower", "banana", "apple", "orange", "mint", "coriander", "chilli", "chili"
        );
        for (String item : storeBrandOnlyList) {
            if (lowerName.contains(item)) {
                return Collections.singletonList("Store Brand");
            }
        }
        
        if (cat.contains("rice")) {
            return Arrays.asList("India Gate", "Daawat", "Fortune");
        } else if (cat.contains("atta") || cat.contains("flour")) {
            return Arrays.asList("Aashirvaad", "Pillsbury", "Annapurna");
        } else if (cat.contains("salt")) {
            return Arrays.asList("Tata", "Aashirvaad", "Catch");
        } else if (cat.contains("ghee")) {
            return Arrays.asList("Amul", "Aashirvaad", "Milky Mist", "Nandini");
        } else if (cat.contains("oil")) {
            return Arrays.asList("Fortune", "Gemini", "Saffola", "Dhara");
        } else if (cat.contains("sugar")) {
            return Arrays.asList("Madhur", "Trust", "Dhampure");
        } else if (cat.contains("milk")) {
            return Arrays.asList("Aavin", "Amul", "Heritage", "Nandini");
        } else if (cat.contains("curd")) {
            return Arrays.asList("Aavin", "Amul", "Heritage", "Milky Mist");
        } else if (cat.contains("spice") || cat.contains("masala")) {
            return Arrays.asList("Aachi", "Sakthi", "Everest", "MTR");
        } else if (cat.contains("chicken")) {
            return Collections.singletonList("Suguna");
        }
        
        return Collections.singletonList("Store Brand");
    }

    private List<String> detectPackSizes(String category, String variety, String name) {
        if (category == null) return Arrays.asList("500g", "1kg");
        String cat = category.toLowerCase().trim();
        String lowerName = name != null ? name.toLowerCase().trim() : "";
        
        if (cat.contains("rice")) {
            return Arrays.asList("1kg", "5kg", "10kg");
        } else if (cat.contains("atta") || cat.contains("flour")) {
            return Arrays.asList("1kg", "5kg", "10kg");
        } else if (cat.contains("salt")) {
            return Arrays.asList("100g", "500g", "1kg");
        } else if (cat.contains("ghee")) {
            return Arrays.asList("200ml", "500ml", "1L");
        } else if (cat.contains("oil")) {
            return Arrays.asList("500ml", "1L", "5L");
        } else if (cat.contains("sugar")) {
            return Arrays.asList("1kg", "5kg");
        } else if (cat.contains("milk")) {
            return Arrays.asList("500ml", "1L");
        } else if (cat.contains("curd")) {
            return Arrays.asList("200g", "500g");
        } else if (cat.contains("spice") || cat.contains("masala")) {
            return Arrays.asList("50g", "100g", "250g");
        } else if (cat.contains("chicken")) {
            if (lowerName.contains("pieces") || lowerName.contains("pcs")) {
                return Arrays.asList("4 pcs", "10 pcs");
            }
            return Arrays.asList("500g", "1kg");
        } else if (cat.contains("brinjal") || cat.contains("eggplant") || cat.contains("okra") || cat.contains("lady")) {
            if (lowerName.contains("piece") || lowerName.contains("pcs") || lowerName.contains("piece")) {
                return Arrays.asList("1 piece", "4 pcs", "10 pcs");
            }
            return Arrays.asList("500g", "1kg");
        }
        
        return Arrays.asList("500g", "1kg");
    }

    private String detectCategory(String name) {
        if (name == null) return "Other";
        String lower = name.toLowerCase();
        if (lower.contains("rice")) return "Rice";
        if (lower.contains("atta") || lower.contains("flour")) return "Atta";
        if (lower.contains("salt")) return "Salt";
        if (lower.contains("eggplant") || lower.contains("brinjal")) return "Brinjal";
        if (lower.contains("lady finger") || lower.contains("okra") || lower.contains("ladyfinger")) return "Okra";
        if (lower.contains("coriander") || lower.contains("cilantro")) return "Coriander Leaves";
        if (lower.contains("onion")) return "Onion";
        if (lower.contains("tomato")) return "Tomato";
        if (lower.contains("potato")) return "Potato";
        if (lower.contains("chilli") || lower.contains("chili")) return "Green Chilli";
        if (lower.contains("curd") || lower.contains("yogurt")) return "Curd";
        if (lower.contains("ghee")) return "Ghee";
        if (lower.contains("ginger garlic")) return "Ginger Garlic Paste";
        if (lower.contains("biryani masala")) return "Biryani Masala";
        if (lower.contains("oil")) return "Oil";
        if (lower.contains("chicken")) return "Chicken";
        if (lower.contains("milk")) return "Milk";
        if (lower.contains("sugar")) return "Sugar";
        return "Other";
    }

    private String detectVariety(String name) {
        if (name == null) return null;
        String lower = name.toLowerCase();
        if (lower.contains("small")) return "small";
        if (lower.contains("big")) return "big";
        if (lower.contains("nattu")) return "nattu";
        if (lower.contains("ponda")) return "ponda";
        if (lower.contains("basmati")) return "basmati";
        if (lower.contains("sona masoori")) return "sona masoori";
        if (lower.contains("ponni")) return "ponni";
        if (lower.contains("brown")) return "brown";
        if (lower.contains("raw")) return "raw";
        if (lower.contains("idli")) return "idli";
        if (lower.contains("jeera samba") || lower.contains("seeraga samba")) return "jeera samba";
        if (lower.contains("matta")) return "matta";
        return null;
    }
}
