package com.cook2cart.productservice.provider;

import com.cook2cart.productservice.dto.ProductSuggestionDTO;
import com.cook2cart.productservice.enums.ProductSource;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

@Component
public class InternalProductProvider implements ProductProvider {

    @Override
    public List<ProductSuggestionDTO> search(String ingredientName) {
        String normalized = normalize(ingredientName);

        if (normalized.contains("mushroom")) {
            return List.of(
                    item(ingredientName, "Fresh Button Mushroom Pack", "Cook2Cart Fresh", "250 g", "89"),
                    item(ingredientName, "Premium Button Mushroom", "Farm Fresh", "200 g", "74"),
                    item(ingredientName, "Organic Button Mushroom", "Green Basket", "250 g", "99")
            );
        }
        if (normalized.contains("butter")) {
            return List.of(
                    item(ingredientName, "Amul Butter", "Amul", "500 g", "285"),
                    item(ingredientName, "Britannia Butter", "Britannia", "500 g", "275"),
                    item(ingredientName, "Nandini Butter", "Nandini", "500 g", "265")
            );
        }
        if (normalized.contains("salt")) {
            return List.of(
                    item(ingredientName, "Tata Salt", "Tata", "1 kg", "27"),
                    item(ingredientName, "Aashirvaad Salt", "Aashirvaad", "1 kg", "25"),
                    item(ingredientName, "Catch Table Salt", "Catch", "1 kg", "35")
            );
        }
        if (normalized.contains("pepper")) {
            return List.of(
                    item(ingredientName, "Catch Black Pepper Powder", "Catch", "100 g", "125"),
                    item(ingredientName, "Everest Black Pepper Powder", "Everest", "100 g", "118"),
                    item(ingredientName, "Organic Tattva Black Pepper Powder", "Organic Tattva", "100 g", "145")
            );
        }
        if (normalized.contains("herb")) {
            return List.of(
                    item(ingredientName, "Keya Mixed Herbs", "Keya", "25 g", "89"),
                    item(ingredientName, "Urban Platter Mixed Herbs", "Urban Platter", "50 g", "149"),
                    item(ingredientName, "Snapin Mixed Herbs", "Snapin", "25 g", "79")
            );
        }
        if (normalized.contains("rice")) {
            return List.of(
                    item(ingredientName, "India Gate Basmati Rice Everyday", "India Gate", "5 kg", "356"),
                    item(ingredientName, "Daawat Rozana Gold Basmati Rice", "Daawat", "5 kg", "429"),
                    item(ingredientName, "Fortune Basmati Rice", "Fortune", "5 kg", "399")
            );
        }
        if (normalized.contains("oil")) {
            return List.of(
                    item(ingredientName, "Jivo Rice Bran Oil", "Jivo", "1 Litre", "189"),
                    item(ingredientName, "Fortune Sunlite Oil", "Fortune", "1 Litre", "165"),
                    item(ingredientName, "Saffola Gold Oil", "Saffola", "1 Litre", "198")
            );
        }
        if (normalized.contains("chicken")) {
            return List.of(
                    item(ingredientName, "FreshToHome Chicken Curry Cut", "FreshToHome", "450 g", "159"),
                    item(ingredientName, "Meatzza Chicken Curry Cut", "Meatzza", "500 g", "179"),
                    item(ingredientName, "Suguna Chicken Curry Cut", "Suguna", "500 g", "169")
            );
        }
        if (normalized.contains("flour") || normalized.contains("maida")) {
            return List.of(
                    item(ingredientName, "Aashirvaad Atta", "Aashirvaad", "1 kg", "65"),
                    item(ingredientName, "Pillsbury Chakki Fresh Atta", "Pillsbury", "1 kg", "62"),
                    item(ingredientName, "Fortune Chakki Fresh Atta", "Fortune", "1 kg", "58")
            );
        }

        return List.of(
                item(ingredientName, titleCase(ingredientName) + " Grocery Pack", "Cook2Cart", "250 g", "79"),
                item(ingredientName, "Premium " + titleCase(ingredientName), "Fresh Basket", "500 g", "129"),
                item(ingredientName, "Value " + titleCase(ingredientName), "Daily Mart", "1 kg", "199")
        );
    }

    private ProductSuggestionDTO item(String ingredientName, String productName, String brandName, String packQuantity, String price) {
        return new ProductSuggestionDTO(
                null,
                null,
                null,
                ingredientName,
                productName,
                brandName,
                null,
                "INTERNAL-" + normalize(productName).replaceAll("[^a-z0-9]+", "-"),
                packQuantity,
                new BigDecimal(price),
                "INR/pack",
                null,
                ProductSource.INTERNAL
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String titleCase(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return "Ingredient";
        }
        StringBuilder builder = new StringBuilder();
        for (String part : normalized.split(" ")) {
            if (part.isBlank()) continue;
            builder.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1)).append(' ');
        }
        return builder.toString().trim();
    }
}
