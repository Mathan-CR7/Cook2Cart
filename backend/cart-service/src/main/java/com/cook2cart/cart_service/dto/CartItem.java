package com.cook2cart.cart_service.dto;

import java.util.List;

public class CartItem {
    private String ingredientName;
    private String originalName;
    private Double recipeQuantity;
    private String recipeUnit;
    private Double quantity;
    private String unit;
    private Double baseQuantity;
    private List<StoreProduct> availableProducts;
    private StoreProduct selectedProduct;
    private List<String> availableBrands;
    private String selectedBrand;
    private List<String> availableSizes;
    private String selectedSize;
    private double price;
    private boolean availableAtHome;
    private List<String> recommendedBrands;

    public CartItem() {
    }

    public CartItem(String ingredientName, String originalName, Double recipeQuantity, String recipeUnit, Double quantity, String unit, Double baseQuantity, List<StoreProduct> availableProducts, StoreProduct selectedProduct, List<String> availableBrands, String selectedBrand, List<String> availableSizes, String selectedSize, double price, boolean availableAtHome, List<String> recommendedBrands) {
        this.ingredientName = ingredientName;
        this.originalName = originalName;
        this.recipeQuantity = recipeQuantity;
        this.recipeUnit = recipeUnit;
        this.quantity = quantity;
        this.unit = unit;
        this.baseQuantity = baseQuantity;
        this.availableProducts = availableProducts;
        this.selectedProduct = selectedProduct;
        this.availableBrands = availableBrands;
        this.selectedBrand = selectedBrand;
        this.availableSizes = availableSizes;
        this.selectedSize = selectedSize;
        this.price = price;
        this.availableAtHome = availableAtHome;
        this.recommendedBrands = recommendedBrands;
    }

    public String getIngredientName() {
        return ingredientName;
    }

    public void setIngredientName(String ingredientName) {
        this.ingredientName = ingredientName;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public Double getRecipeQuantity() {
        return recipeQuantity;
    }

    public void setRecipeQuantity(Double recipeQuantity) {
        this.recipeQuantity = recipeQuantity;
    }

    public String getRecipeUnit() {
        return recipeUnit;
    }

    public void setRecipeUnit(String recipeUnit) {
        this.recipeUnit = recipeUnit;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Double getBaseQuantity() {
        return baseQuantity;
    }

    public void setBaseQuantity(Double baseQuantity) {
        this.baseQuantity = baseQuantity;
    }

    public List<StoreProduct> getAvailableProducts() {
        return availableProducts;
    }

    public void setAvailableProducts(List<StoreProduct> availableProducts) {
        this.availableProducts = availableProducts;
    }

    public StoreProduct getSelectedProduct() {
        return selectedProduct;
    }

    public void setSelectedProduct(StoreProduct selectedProduct) {
        this.selectedProduct = selectedProduct;
    }

    public List<String> getAvailableBrands() {
        return availableBrands;
    }

    public void setAvailableBrands(List<String> availableBrands) {
        this.availableBrands = availableBrands;
    }

    public String getSelectedBrand() {
        return selectedBrand;
    }

    public void setSelectedBrand(String selectedBrand) {
        this.selectedBrand = selectedBrand;
    }

    public List<String> getAvailableSizes() {
        return availableSizes;
    }

    public void setAvailableSizes(List<String> availableSizes) {
        this.availableSizes = availableSizes;
    }

    public String getSelectedSize() {
        return selectedSize;
    }

    public void setSelectedSize(String selectedSize) {
        this.selectedSize = selectedSize;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public boolean isAvailableAtHome() {
        return availableAtHome;
    }

    public void setAvailableAtHome(boolean availableAtHome) {
        this.availableAtHome = availableAtHome;
    }

    public List<String> getRecommendedBrands() {
        return recommendedBrands;
    }

    public void setRecommendedBrands(List<String> recommendedBrands) {
        this.recommendedBrands = recommendedBrands;
    }
}
