package com.cook2cart.cart_service;

import com.cook2cart.cart_service.controller.CartController;
import com.cook2cart.cart_service.dto.Cart;
import com.cook2cart.cart_service.dto.CartItem;
import com.cook2cart.cart_service.dto.Ingredient;
import com.cook2cart.cart_service.dto.StoreProduct;
import com.cook2cart.cart_service.service.CartService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class CartServiceApplicationTests {

	@Autowired
	private CartService cartService;

	@Autowired
	private CartController cartController;

	private org.springframework.web.client.RestTemplate mockRestTemplate;

	@org.junit.jupiter.api.BeforeEach
	void setUp() {
		mockRestTemplate = org.mockito.Mockito.mock(org.springframework.web.client.RestTemplate.class);
		org.springframework.test.util.ReflectionTestUtils.setField(cartService, "restTemplate", mockRestTemplate);

		// Stub for AI price updates
		org.mockito.Mockito.when(mockRestTemplate.postForEntity(
				org.mockito.Mockito.contains("/update-prices"),
				org.mockito.Mockito.any(),
				org.mockito.Mockito.eq(StoreProduct[].class)
		)).thenAnswer(invocation -> {
			List<StoreProduct> input = invocation.getArgument(1);
			StoreProduct[] output = new StoreProduct[input.size()];
			for (int i = 0; i < input.size(); i++) {
				StoreProduct p = input.get(i);
				double currentPrice = p.getPrice();
				double newPrice = currentPrice;
				String name = p.getName() != null ? p.getName().toLowerCase() : "";
				String id = p.getId() != null ? p.getId() : "";
				
				if (name.contains("rice")) {
					if ("r4".equals(id)) {
						newPrice = 58.0;
					} else {
						newPrice = Math.round(currentPrice * 1.05 * 100.0) / 100.0;
					}
				} else if (name.contains("chicken")) {
					if ("ch2".equals(id)) {
						newPrice = 265.0;
					} else {
						newPrice = Math.round(currentPrice * 1.06 * 100.0) / 100.0;
					}
				} else {
					newPrice = Math.round(currentPrice * 1.04 * 100.0) / 100.0;
				}
				output[i] = new StoreProduct(p.getId(), p.getName(), p.getBrand(), p.getSize(), newPrice, p.getCategory());
			}
			return org.springframework.http.ResponseEntity.ok(output);
		});

		// Generic stub for AI parsing in tests
		org.mockito.Mockito.when(mockRestTemplate.postForEntity(
				org.mockito.Mockito.anyString(),
				org.mockito.Mockito.any(),
				org.mockito.Mockito.eq(Ingredient[].class)
		)).thenAnswer(invocation -> {
			List<Ingredient> input = invocation.getArgument(1);
			Ingredient[] output = new Ingredient[input.size()];
			for (int i = 0; i < input.size(); i++) {
				Ingredient ing = input.get(i);
				mockParseIngredient(ing);
				String name = ing.getName().toLowerCase();
				
				if (name.contains("rice") || name.contains("arisi")) {
					List<String> brands = name.contains("arisi") ? 
							Arrays.asList("Aashirvaad", "India Gate", "Daawat", "Fortune") :
							Arrays.asList("India Gate", "Aashirvaad", "Daawat", "Fortune");
					output[i] = new Ingredient("rice", 2.0, "cups", 400.0, "g", false, "speech", 0.95, brands, "Rice", "basmati", Arrays.asList("1kg", "5kg", "10kg"));
				} else if (name.contains("salt")) {
					output[i] = new Ingredient("salt", null, null, 100.0, "g", true, "speech", 0.90, Arrays.asList("Tata", "Aashirvaad", "Catch"), "Salt", null, Arrays.asList("100g", "500g", "1kg"));
				} else if (name.contains("atta")) {
					output[i] = new Ingredient("atta", 2.0, "kg", 2000.0, "g", false, "speech", 0.95, Arrays.asList("Aashirvaad", "Pillsbury", "Annapurna", "Fortune"), "Atta", null, Arrays.asList("1kg", "5kg", "10kg"));
				} else if (name.contains("eggplant")) {
					if (ing.getRecipeQuantity() != null && ing.getRecipeQuantity() == 4.0) {
						output[i] = new Ingredient("brinjal", 4.0, "piece", 4.0, "pcs", false, "speech", 0.95, Arrays.asList("Store Brand"), "Brinjal", null, Arrays.asList("500g", "1kg", "1 piece", "4 pcs"));
					} else {
						output[i] = new Ingredient("brinjal", 1.0, "piece", 500.0, "g", false, "speech", 0.95, Arrays.asList("Store Brand"), "Brinjal", null, Arrays.asList("500g", "1kg", "1 piece", "4 pcs"));
					}
				} else if (name.contains("chicken")) {
					if (ing.getRecipeQuantity() != null && ing.getRecipeQuantity() == 500.0) {
						output[i] = new Ingredient("chicken", 500.0, "g", 500.0, "g", false, "speech", 0.95, Arrays.asList("Suguna"), "Chicken", null, Arrays.asList("500g", "1kg", "4 pcs"));
					} else if (ing.getRecipeQuantity() != null && ing.getRecipeQuantity() == 4.0) {
						output[i] = new Ingredient("chicken", 4.0, "pcs", 4.0, "pcs", false, "speech", 0.95, Arrays.asList("Suguna"), "Chicken", null, Arrays.asList("500g", "1kg", "4 pcs"));
					} else {
						output[i] = new Ingredient("chicken", 1.0, "kg", 1000.0, "g", false, "speech", 0.95, Arrays.asList("Suguna"), "Chicken", null, Arrays.asList("500g", "1kg", "4 pcs"));
					}
				} else if (name.contains("oil")) {
					if (ing.getRecipeQuantity() != null && ing.getRecipeQuantity() == 1.0) {
						output[i] = new Ingredient("oil", 1.0, "tablespoon", 15.0, "ml", false, "speech", 0.95, Arrays.asList("Fortune", "Gemini", "Saffola", "Dhara"), "Oil", null, Arrays.asList("500ml", "1L", "5L"));
					} else {
						output[i] = new Ingredient("oil", null, null, 60.0, "ml", true, "speech", 0.90, Arrays.asList("Fortune", "Gemini", "Saffola", "Dhara"), "Oil", null, Arrays.asList("500ml", "1L", "5L"));
					}
				} else if (name.contains("milk")) {
					output[i] = new Ingredient("milk", 1.0, "liter", 1000.0, "ml", false, "speech", 0.95, Arrays.asList("Aavin", "Amul", "Heritage", "Nandini"), "Milk", null, Arrays.asList("500ml", "1L", "2L"));
				} else if (name.contains("small onion")) {
					output[i] = new Ingredient("small onion", 500.0, "g", 500.0, "g", false, "speech", 0.95, Arrays.asList("Store Brand"), "Onion", "small", Arrays.asList("500g", "1kg"));
				} else if (name.contains("big onion")) {
					output[i] = new Ingredient("big onion", 500.0, "g", 500.0, "g", false, "speech", 0.95, Arrays.asList("Store Brand"), "Onion", "big", Arrays.asList("500g", "1kg"));
				} else if (name.contains("nattu tomato")) {
					output[i] = new Ingredient("nattu tomato", 500.0, "g", 500.0, "g", false, "speech", 0.95, Arrays.asList("Store Brand"), "Tomato", "nattu", Arrays.asList("500g", "1kg"));
				} else if (name.contains("ponda tomato")) {
					output[i] = new Ingredient("ponda tomato", 500.0, "g", 500.0, "g", false, "speech", 0.95, Arrays.asList("Store Brand"), "Tomato", "ponda", Arrays.asList("500g", "1kg"));
				} else {
					output[i] = new Ingredient(ing.getName(), ing.getRecipeQuantity(), ing.getRecipeUnit(), ing.getQuantity(), ing.getUnit(), ing.isEstimated(), ing.getSource(), ing.getConfidence(), new java.util.ArrayList<>(), "Other", null, Arrays.asList("500g", "1kg"));
				}
			}

			// Populate availableProducts on all generated mock ingredients
			for (int i = 0; i < output.length; i++) {
				Ingredient parsed = output[i];
				if (parsed != null) {
					List<String> brands = parsed.getRecommendedBrands();
					List<String> sizes = parsed.getRecommendedPackSizes();
					List<StoreProduct> prodOpts = new ArrayList<>();
					List<String> productNames = getCategoryProductNames(parsed.getCategory());
					for (String pName : productNames) {
						for (String b : brands) {
							for (String s : sizes) {
								double price = estimateFallbackPrice(parsed.getCategory(), b, s, pName);
								String id = generateLegacyIdForTest(parsed.getCategory(), b, s, pName);
								prodOpts.add(new StoreProduct(id, pName, b, s, price, parsed.getCategory()));
							}
						}
					}
					parsed.setProducts(prodOpts);
				}
			}

			return org.springframework.http.ResponseEntity.ok(output);
		});
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

	private String capitalizeTitle(String name) {
		if (name == null || name.isEmpty()) return "";
		String[] parts = name.split("\\s+");
		StringBuilder sb = new StringBuilder();
		for (String part : parts) {
			if (!part.isEmpty()) {
				sb.append(Character.toUpperCase(part.charAt(0)))
				  .append(part.substring(1).toLowerCase())
				  .append(" ");
			}
		}
		return sb.toString().trim();
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

		return 50.0;
	}

	@Test
	void contextLoads() {
		assertNotNull(cartService);
		assertNotNull(cartController);
	}

	@Test
	void testCartFeaturesAndLimitations() {
		// Prepare input ingredients
		List<Ingredient> ingredients = Arrays.asList(
				// 1. Normal ingredient (Rice)
				new Ingredient("Rice", 2.0, "cups", 400.0, "g", false, "speech", 0.95),
				// 2. Missing quantity ingredient (Salt)
				new Ingredient("Salt", null, null, null, null, true, "speech", 0.90),
				// 3. Brand preference test ingredient (Atta)
				new Ingredient("Atta", 2.0, "kg", 2000.0, "g", false, "speech", 0.95),
				// 4. Regional name mapping ingredient (Eggplant)
				new Ingredient("Eggplant", 1.0, "piece", 500.0, "g", false, "speech", 0.95),
				// 5. Price fluctuation test ingredient (Chicken)
				new Ingredient("Chicken", 1.0, "kg", 1000.0, "g", false, "speech", 0.95)
		);

		// Test 1: Cart Initialization (Rules 1, 2, 3, 4, 5)
		Cart cart = cartService.initializeCart(ingredients, 4);
		assertNotNull(cart);
		assertEquals(5, cart.getItems().size());
		assertEquals(4, cart.getOriginalServings());
		assertEquals(4, cart.getTargetServings());

		// Rule 1: Product Mapping (Rice maps to Basmati Rice 1kg by default)
		CartItem riceItem = cart.getItems().get(0);
		assertEquals("Rice", riceItem.getOriginalName());
		assertNotNull(riceItem.getSelectedProduct());
		assertEquals("r1", riceItem.getSelectedProduct().getId());
		assertEquals("Basmati Rice", riceItem.getSelectedProduct().getName());
		assertEquals("1kg", riceItem.getSelectedProduct().getSize());
		// Alternatives available in dropdown
		assertTrue(riceItem.getAvailableProducts().stream().anyMatch(p -> p.getName().contains("Brown Rice")));
		assertTrue(riceItem.getAvailableProducts().stream().anyMatch(p -> p.getName().equals("Rice")));

		// Rule 2: Quantity Conversion (Recipe: 2 cups (~400g) -> Nearest size of selected product size 1kg)
		assertEquals(400.0, riceItem.getQuantity());
		assertEquals("1kg", riceItem.getSelectedSize());
		assertEquals(140.0, riceItem.getPrice());

		// Rule 3: Missing Quantities (Salt -> Estimated 100g -> Tata Salt 100g preselected)
		CartItem saltItem = cart.getItems().get(1);
		assertEquals("Salt", saltItem.getOriginalName());
		assertEquals(100.0, saltItem.getQuantity());
		assertEquals("s1", saltItem.getSelectedProduct().getId());
		assertEquals("Tata", saltItem.getSelectedProduct().getBrand());
		assertEquals("100g", saltItem.getSelectedSize());
		assertEquals(10.0, saltItem.getPrice());

		// Rule 4: Brand Preference (Atta -> Brand dropdown exists, Aashirvaad preselected)
		CartItem attaItem = cart.getItems().get(2);
		assertEquals("Atta", attaItem.getOriginalName());
		assertEquals("Aashirvaad", attaItem.getSelectedBrand());
		assertEquals("a2", attaItem.getSelectedProduct().getId()); // Atta 5kg (since 2kg recipe quantity fits 5kg best)
		assertTrue(attaItem.getAvailableBrands().contains("Pillsbury"));
		assertTrue(attaItem.getAvailableBrands().contains("Annapurna"));

		// Rule 5: Regional Names (Eggplant -> Normalized: brinjal -> display: Eggplant (Brinjal))
		CartItem brinjalItem = cart.getItems().get(3);
		assertEquals("Eggplant (Brinjal)", brinjalItem.getOriginalName());
		assertEquals("brinjal", brinjalItem.getIngredientName());

		// Verify initial total price (Rice: 140, Salt: 10, Atta: 270, Brinjal: 40, Chicken: 250 -> Total: 710.0)
		assertEquals(710.0, cart.getTotalPrice());

		// Test 2: Recipe Scaling (Rule 6: Serves 4 -> Serves 10 -> Factor 2.5)
		// Rice 400g -> 1000g (1kg) -> fits 1kg Basmati Rice
		// Salt 100g -> 250g -> fits 500g Salt (Tata)
		// Atta 2000g -> 5000g -> fits 5kg Atta
		Cart scaledCart = cartService.scaleCart(cart, 10);
		assertEquals(10, scaledCart.getTargetServings());
		
		CartItem scaledRice = scaledCart.getItems().get(0);
		assertEquals(1000.0, scaledRice.getQuantity());
		assertEquals("1kg", scaledRice.getSelectedSize());

		CartItem scaledSalt = scaledCart.getItems().get(1);
		assertEquals(250.0, scaledSalt.getQuantity());
		assertEquals("Tata", scaledSalt.getSelectedBrand());
		assertEquals("500g", scaledSalt.getSelectedSize()); // Auto-scaled to 500g from 1000g target weight
		assertEquals(20.0, scaledSalt.getPrice());

		// Test 3: Price Fluctuation (Rule 7: Fetch Latest Prices)
		// Rice (r1) ₹140 -> +5% = ₹147.0
		// Chicken Suguna 1kg (ch2) ₹250 -> ₹265
		Cart priceCart = cartService.updateLatestPrices(scaledCart);
		CartItem ricePrice = priceCart.getItems().get(0);
		assertEquals(147.0, ricePrice.getPrice());
		CartItem chickenPrice = priceCart.getItems().get(4);
		assertEquals(265.0, chickenPrice.getPrice());

		// Test 4: Product Available at Home (Rule 8: Exclude from total price)
		double priceBeforeHomeCheck = priceCart.getTotalPrice();
		// Mark Rice as available at home
		Cart homeCart = cartService.updateCartItem(priceCart, 0, null, null, null, true);
		assertTrue(homeCart.getItems().get(0).isAvailableAtHome());
		// Total price should decrease by Rice price (147.0)
		assertEquals(priceBeforeHomeCheck - 147.0, homeCart.getTotalPrice());

		// Test 5: User updates product choice manually
		// Change Atta brand from Aashirvaad to Pillsbury
		Cart updatedCart = cartService.updateCartItem(homeCart, 2, null, "Pillsbury", null, null);
		assertEquals("Pillsbury", updatedCart.getItems().get(2).getSelectedBrand());
	}

	@Test
	void testCartControllerEndpoints() {
		List<Ingredient> ingredients = Arrays.asList(
				new Ingredient("Rice", 2.0, "cups", 400.0, "g", false, "speech", 0.95)
		);

		// Initialize endpoint
		ResponseEntity<Cart> initResp = cartController.initializeCart(ingredients, 4);
		assertEquals(200, initResp.getStatusCode().value());
		Cart cart = initResp.getBody();
		assertNotNull(cart);
		assertEquals(140.0, cart.getTotalPrice());

		// Scale endpoint
		ResponseEntity<Cart> scaleResp = cartController.scaleCart(cart, 8);
		assertEquals(200, scaleResp.getStatusCode().value());
		Cart scaled = scaleResp.getBody();
		assertNotNull(scaled);
		assertEquals(8, scaled.getTargetServings());

		// Update item endpoint (available at home)
		ResponseEntity<Cart> updateResp = cartController.updateCartItem(scaled, 0, null, null, null, true);
		assertEquals(200, updateResp.getStatusCode().value());
		Cart updated = updateResp.getBody();
		assertNotNull(updated);
		assertTrue(updated.getItems().get(0).isAvailableAtHome());
		assertEquals(0.0, updated.getTotalPrice());
	}

	@Test
	void testNewExtractionAndBrandRankingRules() {
		List<Ingredient> ingredients = Arrays.asList(
				// Raw ingredient with quantity, unit and action to ignore
				new Ingredient("2 cups chopped Arisi", null, null, null, null, false, "speech", 0.95),
				// Liquid with tablespoon to convert to ml, and action
				new Ingredient("1 tablespoon oil", null, null, null, null, false, "speech", 0.95),
				// Weight with g
				new Ingredient("500 g chicken cut into pieces", null, null, null, null, false, "speech", 0.95),
				// Volume with liter to ml
				new Ingredient("1 liter fresh milk", null, null, null, null, false, "speech", 0.95),
				// Missing quantity
				new Ingredient("some salt", null, null, null, null, true, "speech", 0.90),
				// Another missing quantity (oil)
				new Ingredient("little oil", null, null, null, null, true, "speech", 0.90),
				// Count-based (4 piece eggplant)
				new Ingredient("4 piece eggplant", null, null, null, null, false, "speech", 0.95),
				// Count-based (4 pcs chicken)
				new Ingredient("4 pcs chicken", null, null, null, null, false, "speech", 0.95)
		);

		Cart cart = cartService.initializeCart(ingredients, 4);
		assertNotNull(cart);
		assertEquals(8, cart.getItems().size());

		// 1. Arisi -> Rice, 2 cups -> 400g, action "chopped" ignored
		CartItem arisiItem = cart.getItems().get(0);
		assertEquals("rice", arisiItem.getIngredientName());
		assertEquals("Arisi (Rice)", arisiItem.getOriginalName()); // original label: capitalized name + (Rice)
		assertEquals(400.0, arisiItem.getQuantity());
		assertEquals("g", arisiItem.getUnit());
		// Brand ranking for Rice: Aashirvaad, India Gate, Daawat, Fortune
		assertNotNull(arisiItem.getRecommendedBrands());
		assertEquals(Arrays.asList("Aashirvaad", "India Gate", "Daawat", "Fortune"), arisiItem.getRecommendedBrands());

		// 2. 1 tablespoon oil -> oil, 1 tbsp -> 15ml
		CartItem oilItem = cart.getItems().get(1);
		assertEquals("oil", oilItem.getIngredientName());
		assertEquals(15.0, oilItem.getQuantity());
		assertEquals("ml", oilItem.getUnit());
		// Brand ranking for Oil: Fortune, Gemini, Saffola, Dhara
		assertEquals(Arrays.asList("Fortune", "Gemini", "Saffola", "Dhara"), oilItem.getRecommendedBrands());

		// 3. 500 g chicken cut into pieces -> chicken, 500g, action "cut into pieces" ignored
		CartItem chickenItem = cart.getItems().get(2);
		assertEquals("chicken", chickenItem.getIngredientName());
		assertEquals(500.0, chickenItem.getQuantity());
		assertEquals("g", chickenItem.getUnit());

		// 4. 1 liter fresh milk -> milk, 1 liter -> 1000ml, action "fresh" ignored
		CartItem milkItem = cart.getItems().get(3);
		assertEquals("milk", milkItem.getIngredientName());
		assertEquals(1000.0, milkItem.getQuantity());
		assertEquals("ml", milkItem.getUnit());
		// Brand ranking for Milk: Aavin, Amul, Heritage, Nandini
		assertEquals(Arrays.asList("Aavin", "Amul", "Heritage", "Nandini"), milkItem.getRecommendedBrands());

		// 5. some salt -> salt, quantity estimated -> 100g, action "some" ignored
		CartItem saltItem = cart.getItems().get(4);
		assertEquals("salt", saltItem.getIngredientName());
		assertEquals(100.0, saltItem.getQuantity());
		assertEquals("g", saltItem.getUnit());
		assertTrue(saltItem.getRecommendedBrands().contains("Tata"));

		// 6. little oil -> oil, quantity estimated -> 15 * 4 = 60ml, action "little" ignored
		CartItem estOilItem = cart.getItems().get(5);
		assertEquals("oil", estOilItem.getIngredientName());
		assertEquals(60.0, estOilItem.getQuantity());
		assertEquals("ml", estOilItem.getUnit());

		// 7. 4 piece eggplant -> selectedProduct size is "4 pcs"
		CartItem eggItem = cart.getItems().get(6);
		assertEquals("brinjal", eggItem.getIngredientName());
		assertEquals(4.0, eggItem.getQuantity());
		assertEquals("pcs", eggItem.getUnit());
		assertNotNull(eggItem.getSelectedProduct());
		assertEquals("e4", eggItem.getSelectedProduct().getId());
		assertEquals("4 pcs", eggItem.getSelectedProduct().getSize());
		// Recommended brands from matches: Store Brand
		assertEquals(Collections.singletonList("Store Brand"), eggItem.getRecommendedBrands());

		// 8. 4 pcs chicken -> selectedProduct size is "4 pcs"
		CartItem chItem = cart.getItems().get(7);
		assertEquals("chicken", chItem.getIngredientName());
		assertEquals(4.0, chItem.getQuantity());
		assertEquals("pcs", chItem.getUnit());
		assertNotNull(chItem.getSelectedProduct());
		assertEquals("ch3", chItem.getSelectedProduct().getId());
		assertEquals("4 pcs", chItem.getSelectedProduct().getSize());
		// Recommended brands from matches: Suguna
		assertEquals(Collections.singletonList("Suguna"), chItem.getRecommendedBrands());
	}

	@Test
	void testVarietyProductMatching() {
		List<Ingredient> ingredients = Arrays.asList(
				new Ingredient("small onion", 500.0, "g", 500.0, "g", false, "speech", 0.95),
				new Ingredient("big onion", 500.0, "g", 500.0, "g", false, "speech", 0.95),
				new Ingredient("nattu tomato", 500.0, "g", 500.0, "g", false, "speech", 0.95),
				new Ingredient("ponda tomato", 500.0, "g", 500.0, "g", false, "speech", 0.95)
		);

		Cart cart = cartService.initializeCart(ingredients, 4);
		assertNotNull(cart);
		assertEquals(4, cart.getItems().size());

		// 1. small onion -> should select "on3" (Small Onion)
		CartItem smallOnionItem = cart.getItems().get(0);
		assertEquals("small onion", smallOnionItem.getIngredientName());
		assertEquals("on3", smallOnionItem.getSelectedProduct().getId());
		assertEquals("Small Onion", smallOnionItem.getSelectedProduct().getName());

		// 2. big onion -> should select "on4" (Big Onion)
		CartItem bigOnionItem = cart.getItems().get(1);
		assertEquals("big onion", bigOnionItem.getIngredientName());
		assertEquals("on4", bigOnionItem.getSelectedProduct().getId());
		assertEquals("Big Onion", bigOnionItem.getSelectedProduct().getName());

		// 3. nattu tomato -> should select "t3" (Nattu Tomato)
		CartItem nattuTomatoItem = cart.getItems().get(2);
		assertEquals("nattu tomato", nattuTomatoItem.getIngredientName());
		assertEquals("t3", nattuTomatoItem.getSelectedProduct().getId());
		assertEquals("Nattu Tomato", nattuTomatoItem.getSelectedProduct().getName());

		// 4. ponda tomato -> should select "t4" (Ponda Tomato)
		CartItem pondaTomatoItem = cart.getItems().get(3);
		assertEquals("ponda tomato", pondaTomatoItem.getIngredientName());
		assertEquals("t4", pondaTomatoItem.getSelectedProduct().getId());
		assertEquals("Ponda Tomato", pondaTomatoItem.getSelectedProduct().getName());
	}

	@Test
	void testAiServiceIntegrationHappyPath() {
		List<Ingredient> inputIngredients = Arrays.asList(
				new Ingredient("2 cups arisi", null, null, null, null, false, "speech", 0.95)
		);

		Cart cart = cartService.initializeCart(inputIngredients, 4);
		assertNotNull(cart);
		assertEquals(1, cart.getItems().size());
		CartItem item = cart.getItems().get(0);
		assertEquals("rice", item.getIngredientName());
		assertEquals("Arisi (Rice)", item.getOriginalName());
		assertEquals(400.0, item.getQuantity());
		assertEquals("g", item.getUnit());
	}

	private String generateLegacyIdForTest(String category, String brand, String size, String productName) {
		if (category == null || brand == null || size == null || productName == null) return "dyn_gen";
		String cat = category.toLowerCase().trim();
		String b = brand.toLowerCase().trim();
		String s = size.toLowerCase().trim();
		String pName = productName.toLowerCase().trim();
		
		if (cat.contains("rice")) {
			if (pName.contains("basmati")) {
				if (b.contains("india gate")) {
					if (s.equals("1kg")) return "r1";
					if (s.equals("5kg")) return "r2";
				}
				if (b.contains("daawat") && s.equals("1kg")) return "r3";
				if (b.contains("fortune") && s.equals("1kg")) return "r3b";
			}
			if (pName.contains("sona masoori")) {
				if (b.contains("fortune") && s.equals("1kg")) return "r4";
				if (b.contains("aashirvaad") && s.equals("1kg")) return "r4b";
			}
			if (pName.contains("ponni") && b.contains("ponni") && s.equals("1kg")) return "r5";
			if (pName.contains("brown") && b.contains("24 mantra") && s.equals("1kg")) return "r6";
			if (pName.contains("raw") && b.contains("store") && s.equals("1kg")) return "r7";
			if (pName.contains("idli") && b.contains("local") && s.equals("1kg")) return "r8";
			if (pName.contains("jeera") && b.contains("local") && s.equals("1kg")) return "r9";
			if (pName.contains("matta") && b.contains("double") && s.equals("1kg")) return "r10";
			if (pName.equals("rice") && b.contains("store")) {
				if (s.equals("1kg")) return "r11";
				if (s.equals("5kg")) return "r12";
				if (s.equals("10kg")) return "r13";
			}
		}
		
		if (cat.contains("atta")) {
			if (b.contains("aashirvaad")) {
				if (s.equals("1kg")) return "a1";
				if (s.equals("5kg")) return "a2";
			}
			if (b.contains("pillsbury")) {
				if (s.equals("1kg")) return "a3";
				if (s.equals("5kg")) return "a4";
			}
			if (b.contains("annapurna") && s.equals("1kg")) return "a5";
			if (b.contains("store") && s.equals("1kg")) return "a6";
		}
		
		if (cat.contains("salt")) {
			if (b.contains("tata")) {
				if (s.equals("100g")) return "s1";
				if (s.equals("500g")) return "s2";
				if (s.equals("1kg")) return "s3";
			}
			if (b.contains("store") && s.equals("1kg")) return "s4";
		}
		
		if (cat.contains("onion")) {
			if (pName.equals("onion")) {
				if (s.equals("500g")) return "on1";
				if (s.equals("1kg")) return "on2";
			}
			if (pName.contains("small") && s.equals("500g")) return "on3";
			if (pName.contains("big") && s.equals("500g")) return "on4";
		}
		
		if (cat.contains("tomato")) {
			if (pName.equals("tomato")) {
				if (s.equals("500g")) return "t1";
				if (s.equals("1kg")) return "t2";
			}
			if (pName.contains("nattu") && s.equals("500g")) return "t3";
			if (pName.contains("ponda") && s.equals("500g")) return "t4";
		}
		
		if (cat.contains("potato") && b.contains("store") && s.equals("1kg")) return "pot1";
		
		if (cat.contains("brinjal") || cat.contains("eggplant")) {
			if (s.equals("500g")) return "e1";
			if (s.equals("1kg")) return "e2";
			if (s.equals("1 piece")) return "e3";
			if (s.equals("4 pcs")) return "e4";
		}
		
		if (cat.contains("okra") || cat.contains("lady")) {
			if (pName.contains("okra")) {
				if (s.equals("500g")) return "o1";
				if (s.equals("1kg")) return "o2";
				if (s.equals("10 pcs")) return "o3";
				if (s.equals("30 pcs")) return "o4";
			}
			if (pName.contains("lady")) {
				if (s.equals("500g")) return "o5";
				if (s.equals("1kg")) return "o6";
			}
		}
		
		if (cat.contains("coriander") || cat.contains("cilantro")) {
			if (s.equals("100g")) return "c1";
			if (s.equals("250g")) return "c2";
			if (s.equals("1 bunch")) return "c3";
			if (s.equals("3 bunches")) return "c4";
		}
		
		if (cat.contains("green chilli") && s.equals("100g")) return "gc1";
		
		if (cat.contains("oil")) {
			if (b.contains("fortune")) {
				if (s.equals("500ml")) return "oil1";
				if (s.equals("1l")) return "oil2";
				if (s.equals("5l")) return "oil3";
			}
		}
		
		if (cat.contains("chicken")) {
			if (b.contains("suguna")) {
				if (s.equals("500g")) return "ch1";
				if (s.equals("1kg")) return "ch2";
				if (s.equals("4 pcs") || pName.contains("legs")) return "ch3";
			}
		}
		
		if (cat.contains("milk")) {
			if (s.equals("1l")) {
				if (b.contains("amul")) return "milk1";
				if (b.contains("aavin")) return "milk2";
				if (b.contains("nandini")) return "milk4";
			}
			if (s.equals("500ml") && b.contains("heritage")) return "milk3";
		}
		
		if (cat.contains("curd")) {
			if (s.equals("500g")) {
				if (b.contains("aavin")) return "curd1";
				if (b.contains("amul")) return "curd2";
			}
		}
		
		if (cat.contains("sugar")) {
			if (s.equals("1kg")) {
				if (b.contains("madhur")) return "sugar1";
				if (b.contains("trust")) return "sugar2";
				if (b.contains("dhampure")) return "sugar3";
			}
		}
		
		if (cat.contains("ghee")) {
			if (s.equals("200ml")) {
				if (b.contains("amul")) return "ghee1";
				if (b.contains("aashirvaad")) return "ghee2";
			}
		}
		
		if (cat.contains("ginger garlic") && b.contains("aachi") && s.equals("100g")) return "ggpaste1";
		if (cat.contains("biryani masala") && b.contains("aachi") && s.equals("50g")) return "bmasala1";
		
		return "dyn_" + cat + "_" + b.replace(" ", "") + "_" + s;
	}

	private void mockParseIngredient(Ingredient ing) {
		String rawName = ing.getName().toLowerCase().trim();
		if (rawName.startsWith("2 cups")) {
			ing.setRecipeQuantity(2.0);
			ing.setRecipeUnit("cups");
		} else if (rawName.startsWith("1 tablespoon")) {
			ing.setRecipeQuantity(1.0);
			ing.setRecipeUnit("tablespoon");
		} else if (rawName.startsWith("500 g")) {
			ing.setRecipeQuantity(500.0);
			ing.setRecipeUnit("g");
		} else if (rawName.startsWith("1 liter")) {
			ing.setRecipeQuantity(1.0);
			ing.setRecipeUnit("liter");
		} else if (rawName.startsWith("4 piece")) {
			ing.setRecipeQuantity(4.0);
			ing.setRecipeUnit("piece");
		} else if (rawName.startsWith("4 pcs")) {
			ing.setRecipeQuantity(4.0);
			ing.setRecipeUnit("pcs");
		}
	}
}
