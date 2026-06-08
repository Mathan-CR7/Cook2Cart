package com.cook2cart.cart_service.dto;

public class Ingredient {
    private Long ingredientId;
    private String name;
    private Double recipeQuantity;
    private String recipeUnit;
    private Double quantity;
    private String unit;
    private boolean estimated;
    private String source;
    private double confidence;
    private java.util.List<String> recommendedBrands;
    private String category;
    private String variety;
    private java.util.List<String> recommendedPackSizes;
    private java.util.List<StoreProduct> products;

    public Ingredient() {
        this.recommendedBrands = new java.util.ArrayList<>();
        this.recommendedPackSizes = new java.util.ArrayList<>();
        this.products = new java.util.ArrayList<>();
    }

    public Ingredient(String name, Double recipeQuantity, String recipeUnit, Double quantity, String unit, boolean estimated, String source, double confidence) {
        this.name = name;
        this.recipeQuantity = recipeQuantity;
        this.recipeUnit = recipeUnit;
        this.quantity = quantity;
        this.unit = unit;
        this.estimated = estimated;
        this.source = source;
        this.confidence = confidence;
        this.recommendedBrands = new java.util.ArrayList<>();
        this.recommendedPackSizes = new java.util.ArrayList<>();
        this.products = new java.util.ArrayList<>();
    }

    public Ingredient(String name, Double recipeQuantity, String recipeUnit, Double quantity, String unit, boolean estimated, String source, double confidence, java.util.List<String> recommendedBrands) {
        this.name = name;
        this.recipeQuantity = recipeQuantity;
        this.recipeUnit = recipeUnit;
        this.quantity = quantity;
        this.unit = unit;
        this.estimated = estimated;
        this.source = source;
        this.confidence = confidence;
        this.recommendedBrands = recommendedBrands;
        this.recommendedPackSizes = new java.util.ArrayList<>();
        this.products = new java.util.ArrayList<>();
    }

    public Ingredient(String name, Double recipeQuantity, String recipeUnit, Double quantity, String unit, boolean estimated, String source, double confidence, java.util.List<String> recommendedBrands, String category, String variety) {
        this.name = name;
        this.recipeQuantity = recipeQuantity;
        this.recipeUnit = recipeUnit;
        this.quantity = quantity;
        this.unit = unit;
        this.estimated = estimated;
        this.source = source;
        this.confidence = confidence;
        this.recommendedBrands = recommendedBrands;
        this.category = category;
        this.variety = variety;
        this.recommendedPackSizes = new java.util.ArrayList<>();
        this.products = new java.util.ArrayList<>();
    }

    public Ingredient(String name, Double recipeQuantity, String recipeUnit, Double quantity, String unit, boolean estimated, String source, double confidence, java.util.List<String> recommendedBrands, String category, String variety, java.util.List<String> recommendedPackSizes) {
        this.name = name;
        this.recipeQuantity = recipeQuantity;
        this.recipeUnit = recipeUnit;
        this.quantity = quantity;
        this.unit = unit;
        this.estimated = estimated;
        this.source = source;
        this.confidence = confidence;
        this.recommendedBrands = recommendedBrands;
        this.category = category;
        this.variety = variety;
        this.recommendedPackSizes = recommendedPackSizes;
        this.products = new java.util.ArrayList<>();
    }

    public Long getIngredientId() {
        return ingredientId;
    }

    public void setIngredientId(Long ingredientId) {
        this.ingredientId = ingredientId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public boolean isEstimated() {
        return estimated;
    }

    public void setEstimated(boolean estimated) {
        this.estimated = estimated;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public java.util.List<String> getRecommendedBrands() {
        return recommendedBrands;
    }

    public void setRecommendedBrands(java.util.List<String> recommendedBrands) {
        this.recommendedBrands = recommendedBrands;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getVariety() {
        return variety;
    }

    public void setVariety(String variety) {
        this.variety = variety;
    }

    public java.util.List<String> getRecommendedPackSizes() {
        return recommendedPackSizes;
    }

    public void setRecommendedPackSizes(java.util.List<String> recommendedPackSizes) {
        this.recommendedPackSizes = recommendedPackSizes;
    }

    public java.util.List<StoreProduct> getProducts() {
        return products;
    }

    public void setProducts(java.util.List<StoreProduct> products) {
        this.products = products;
    }
}
