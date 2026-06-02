package com.cook2cart.ai_service.util;

import com.cook2cart.ai_service.dto.Ingredient;
import java.util.HashMap;
import java.util.Map;

public class MetricConverter {
    
    private static final Map<String, String> TRANSLATION_MAP = new HashMap<>();
    static {
        TRANSLATION_MAP.put("mirchi", "green chilli");
        TRANSLATION_MAP.put("hari mirch", "green chilli");
        TRANSLATION_MAP.put("hara dhania", "coriander");
        TRANSLATION_MAP.put("dhaniya", "coriander");
        TRANSLATION_MAP.put("pachai milagai", "green chilli");
        TRANSLATION_MAP.put("pacha mirapakaya", "green chilli");
        TRANSLATION_MAP.put("pachimirchi", "green chilli");
        TRANSLATION_MAP.put("hasi menasinakai", "green chilli");
        TRANSLATION_MAP.put("pacha mulaku", "green chilli");
        TRANSLATION_MAP.put("chile verde", "green chilli");
        TRANSLATION_MAP.put("pimiento verde", "green chilli");
        TRANSLATION_MAP.put("piment vert", "green chilli");
        TRANSLATION_MAP.put("grüne chili", "green chilli");
        TRANSLATION_MAP.put("peperoncino verde", "green chilli");

        TRANSLATION_MAP.put("pyaz", "onion");
        TRANSLATION_MAP.put("vengayam", "onion");
        TRANSLATION_MAP.put("ullipaya", "onion");
        TRANSLATION_MAP.put("ulligadda", "onion");
        TRANSLATION_MAP.put("erragadda", "onion");
        TRANSLATION_MAP.put("erulli", "onion");
        TRANSLATION_MAP.put("savala", "onion");
        TRANSLATION_MAP.put("ulli", "onion");
        TRANSLATION_MAP.put("cebolla", "onion");
        TRANSLATION_MAP.put("oignon", "onion");
        TRANSLATION_MAP.put("zwiebel", "onion");
        TRANSLATION_MAP.put("cipolla", "onion");

        TRANSLATION_MAP.put("tamatar", "tomato");
        TRANSLATION_MAP.put("thakkali", "tomato");
        TRANSLATION_MAP.put("tamata", "tomato");
        TRANSLATION_MAP.put("ramamulaga", "tomato");
        TRANSLATION_MAP.put("tomate", "tomato");
        TRANSLATION_MAP.put("pomodoro", "tomato");


        TRANSLATION_MAP.put("dhania", "coriander");
        TRANSLATION_MAP.put("kothamalli", "coriander");
        TRANSLATION_MAP.put("kothimera", "coriander");
        TRANSLATION_MAP.put("kothambari", "coriander");
        TRANSLATION_MAP.put("malli", "coriander");
        TRANSLATION_MAP.put("cilantro", "coriander");
        TRANSLATION_MAP.put("coriandre", "coriander");
        TRANSLATION_MAP.put("koriander", "coriander");
        TRANSLATION_MAP.put("coriandolo", "coriander");

        TRANSLATION_MAP.put("adrak", "ginger");
        TRANSLATION_MAP.put("inji", "ginger");
        TRANSLATION_MAP.put("allam", "ginger");
        TRANSLATION_MAP.put("shunti", "ginger");
        TRANSLATION_MAP.put("jengibre", "ginger");
        TRANSLATION_MAP.put("gingembre", "ginger");
        TRANSLATION_MAP.put("ingwer", "ginger");
        TRANSLATION_MAP.put("zenzero", "ginger");

        TRANSLATION_MAP.put("lasun", "garlic");
        TRANSLATION_MAP.put("lahsun", "garlic");
        TRANSLATION_MAP.put("poondu", "garlic");
        TRANSLATION_MAP.put("vellai poondu", "garlic");
        TRANSLATION_MAP.put("vellulli", "garlic");
        TRANSLATION_MAP.put("ellipaya", "garlic");
        TRANSLATION_MAP.put("bellulli", "garlic");
        TRANSLATION_MAP.put("veluthulli", "garlic");
        TRANSLATION_MAP.put("ajo", "garlic");
        TRANSLATION_MAP.put("ail", "garlic");
        TRANSLATION_MAP.put("knoblauch", "garlic");
        TRANSLATION_MAP.put("aglio", "garlic");

        TRANSLATION_MAP.put("baingan", "eggplant");
        TRANSLATION_MAP.put("baingna", "eggplant");
        TRANSLATION_MAP.put("kathirikai", "eggplant");
        TRANSLATION_MAP.put("vankaya", "eggplant");
        TRANSLATION_MAP.put("badanekai", "eggplant");
        TRANSLATION_MAP.put("vazhuthananga", "eggplant");
        TRANSLATION_MAP.put("berenjena", "eggplant");
        TRANSLATION_MAP.put("aubergine", "eggplant");
        TRANSLATION_MAP.put("brinjal", "eggplant");
        TRANSLATION_MAP.put("melanzana", "eggplant");
    }
    
    public static void convertToMetric(Ingredient ingredient, String transcript) {
        if (ingredient == null) {
            return;
        }

        String rawName = ingredient.getName() != null ? ingredient.getName().toLowerCase().trim() : "";
        boolean matched = false;
        if (TRANSLATION_MAP.containsKey(rawName)) {
            ingredient.setName(TRANSLATION_MAP.get(rawName));
            matched = true;
        } else {
            for (Map.Entry<String, String> entry : TRANSLATION_MAP.entrySet()) {
                String key = entry.getKey();
                if (rawName.equals(key) || rawName.startsWith(key + " ") || rawName.endsWith(" " + key) || rawName.contains(" " + key + " ")) {
                    ingredient.setName(entry.getValue());
                    matched = true;
                    break;
                }
            }
        }

        if (!matched) {
            if (rawName.contains("brinjal") || rawName.contains("aubergine")) {
                ingredient.setName("eggplant");
            }
        }

        String name = ingredient.getName() != null ? ingredient.getName().toLowerCase() : "";

        if (ingredient.getRecipeQuantity() == null) {
            ingredient.setEstimated(true);
            int servings = parseServings(transcript);
            
            if (name.contains("oil")) {
                ingredient.setRecipeQuantity(1.0 * servings); // roughly 1 tbsp per serving
                ingredient.setRecipeUnit("tablespoon");
                ingredient.setQuantity(15.0 * servings);
                ingredient.setUnit("ml");
            } else if (name.contains("rice")) {
                ingredient.setRecipeQuantity(100.0 * servings);
                ingredient.setRecipeUnit("g");
                ingredient.setQuantity(100.0 * servings);
                ingredient.setUnit("g");
            } else if (name.contains("water")) {
                ingredient.setRecipeQuantity(240.0 * servings);
                ingredient.setRecipeUnit("ml");
                ingredient.setQuantity(240.0 * servings);
                ingredient.setUnit("ml");
            } else if (name.contains("salt")) {
                ingredient.setRecipeQuantity(0.33 * servings); // roughly in teaspoons
                ingredient.setRecipeUnit("teaspoon");
                ingredient.setQuantity(2.0 * servings);
                ingredient.setUnit("g");
            } else if (name.contains("onion")) {
                ingredient.setRecipeQuantity(1.0 * servings);
                ingredient.setRecipeUnit("piece");
                ingredient.setQuantity(50.0 * servings);
                ingredient.setUnit("g");
            } else if (name.contains("tomato")) {
                ingredient.setRecipeQuantity(1.0 * servings);
                ingredient.setRecipeUnit("piece");
                ingredient.setQuantity(60.0 * servings);
                ingredient.setUnit("g");
            } else if (name.contains("garlic")) {
                ingredient.setRecipeQuantity(1.0 * servings);
                ingredient.setRecipeUnit("clove");
                ingredient.setQuantity(5.0 * servings);
                ingredient.setUnit("g");
            } else if (name.contains("ginger")) {
                ingredient.setRecipeQuantity(1.0 * servings);
                ingredient.setRecipeUnit("piece");
                ingredient.setQuantity(5.0 * servings);
                ingredient.setUnit("g");
            } else if (name.contains("chilli") || name.contains("chili")) {
                ingredient.setRecipeQuantity(1.0 * servings);
                ingredient.setRecipeUnit("piece");
                ingredient.setQuantity(5.0 * servings);
                ingredient.setUnit("g");
            } else {
                ingredient.setRecipeQuantity(1.0);
                if (name.contains("sauce") || name.contains("vinegar")) {
                    ingredient.setRecipeUnit("cup");
                } else {
                    ingredient.setRecipeUnit("piece");
                }
            }
        }

        String unit = ingredient.getRecipeUnit() != null ? ingredient.getRecipeUnit().toLowerCase() : "";
        double qty = ingredient.getRecipeQuantity();

        if (name.contains("salt") && (unit.contains("pinch") || unit.isEmpty())) {
            ingredient.setRecipeQuantity(qty);
            ingredient.setRecipeUnit("pinch");
            ingredient.setQuantity(0.5 * qty);
            ingredient.setUnit("g");
            ingredient.setEstimated(true);
            return;
        } else if (name.contains("peanut") && unit.contains("handful")) {
            ingredient.setRecipeQuantity(qty);
            ingredient.setRecipeUnit("handful");
            ingredient.setQuantity(30.0 * qty);
            ingredient.setUnit("g");
            ingredient.setEstimated(true);
            return;
        } else if (name.contains("coriander") && unit.contains("handful")) {
            ingredient.setRecipeQuantity(qty);
            ingredient.setRecipeUnit("handful");
            ingredient.setQuantity(20.0 * qty);
            ingredient.setUnit("g");
            ingredient.setEstimated(true);
            return;
        } else if (name.contains("curry") && unit.contains("handful")) {
            ingredient.setRecipeQuantity(qty);
            ingredient.setRecipeUnit("handful");
            ingredient.setQuantity(10.0 * qty);
            ingredient.setUnit("g");
            ingredient.setEstimated(true);
            return;
        }

        boolean isLiquid = name.contains("oil") || name.contains("milk") || name.contains("water") ||
                           name.contains("extract") || name.contains("juice") || name.contains("sauce") || 
                           name.contains("vinegar");

        if (unit.contains("glass")) {
            ingredient.setQuantity(qty * 200);
            ingredient.setUnit(isLiquid ? "ml" : "g");
            return;
        } else if (unit.contains("tumbler")) {
            ingredient.setQuantity(qty * 250);
            ingredient.setUnit(isLiquid ? "ml" : "g");
            return;
        } else if (unit.contains("katori")) {
            ingredient.setQuantity(qty * 150);
            ingredient.setUnit(isLiquid ? "ml" : "g");
            return;
        }

        if (isLiquid) {
            ingredient.setUnit("ml");
            if (unit.contains("cup")) {
                ingredient.setQuantity(qty * 240);
            } else if (unit.contains("tablespoon") || unit.contains("tbsp")) {
                ingredient.setQuantity(qty * 15);
            } else if (unit.contains("teaspoon") || unit.contains("tsp")) {
                ingredient.setQuantity(qty * 5);
            } else if (unit.contains("ounce") || unit.contains("oz")) {
                ingredient.setQuantity(qty * 30);
            } else {
                ingredient.setQuantity(qty);
                ingredient.setUnit(unit);
            }
            return;
        }

        if (unit.contains("piece") || unit.contains("pcs") || unit.isEmpty()) {
            ingredient.setQuantity(qty);
            ingredient.setUnit("pieces");
            return;
        }

        ingredient.setUnit("g");
        if (name.contains("butter")) {
            if (unit.contains("cup")) {
                ingredient.setQuantity(qty * 227);
            } else if (unit.contains("tablespoon") || unit.contains("tbsp")) {
                ingredient.setQuantity(qty * 14);
            } else {
                ingredient.setQuantity(qty * 28.35); // assume ounces
            }
        } else if (name.contains("flour")) {
            if (unit.contains("cup")) {
                ingredient.setQuantity(qty * 120);
            } else {
                ingredient.setQuantity(qty * 28.35);
            }
        } else if (name.contains("sugar")) {
            if (unit.contains("cup")) {
                ingredient.setQuantity(qty * 200);
            } else {
                ingredient.setQuantity(qty * 28.35);
            }
        } else if (name.contains("chip")) {
            if (unit.contains("cup")) {
                ingredient.setQuantity(qty * 170);
            } else {
                ingredient.setQuantity(qty * 28.35);
            }
        } else if (name.contains("spaghetti") || name.contains("pasta")) {
            if (unit.contains("ounce") || unit.contains("oz")) {
                ingredient.setQuantity(qty * 28.35);
            } else {
                ingredient.setQuantity(qty);
                ingredient.setUnit(unit);
            }
        } else if (name.contains("cheese")) {
            if (unit.contains("cup")) {
                ingredient.setQuantity(qty * 100);
            } else {
                ingredient.setQuantity(qty * 28.35);
            }
        } else if (name.contains("tomato")) {
            if (unit.contains("cup")) {
                ingredient.setQuantity(qty * 150);
            } else {
                ingredient.setQuantity(qty * 28.35);
            }
        } else if (name.contains("garlic")) {
            if (unit.contains("clove")) {
                ingredient.setQuantity(qty * 5);
            } else {
                ingredient.setQuantity(qty);
            }
        } else if (name.contains("salt")) {
            if (unit.contains("teaspoon") || unit.contains("tsp")) {
                ingredient.setQuantity(qty * 6);
            } else {
                ingredient.setQuantity(qty);
            }
        } else if (name.contains("soda")) {
            if (unit.contains("teaspoon") || unit.contains("tsp")) {
                ingredient.setQuantity(qty * 5);
            } else {
                ingredient.setQuantity(qty);
            }
        } else {
            if (unit.contains("cup")) {
                ingredient.setQuantity(qty * 150);
            } else if (unit.contains("tablespoon") || unit.contains("tbsp")) {
                ingredient.setQuantity(qty * 10);
            } else if (unit.contains("teaspoon") || unit.contains("tsp")) {
                ingredient.setQuantity(qty * 3);
            } else if (unit.contains("ounce") || unit.contains("oz")) {
                ingredient.setQuantity(qty * 28.35);
            } else if (unit.contains("gram") || unit.contains("g")) {
                ingredient.setQuantity(qty);
            } else {
                ingredient.setQuantity(qty);
                ingredient.setUnit(unit);
            }
        }
    }

    private static int parseServings(String transcript) {
        if (transcript == null || transcript.isEmpty()) {
            return 2;
        }
        String t = transcript.toLowerCase();
        
        if (t.contains("one person") || t.contains("1 person") || t.contains("single person")) {
            return 1;
        }
        
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "(serves|for|family of)\\s*(\\d+)"
        );
        java.util.regex.Matcher matcher = pattern.matcher(t);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(2));
            } catch (NumberFormatException e) {
            }
        }
        
        if (t.contains("serves two") || t.contains("for two") || t.contains("two people") || t.contains("two persons")) return 2;
        if (t.contains("serves three") || t.contains("for three") || t.contains("three people") || t.contains("three persons")) return 3;
        if (t.contains("serves four") || t.contains("for four") || t.contains("four people") || t.contains("four persons")) return 4;
        if (t.contains("serves five") || t.contains("for five") || t.contains("five people") || t.contains("five persons")) return 5;
        
        return 2;
    }
}
