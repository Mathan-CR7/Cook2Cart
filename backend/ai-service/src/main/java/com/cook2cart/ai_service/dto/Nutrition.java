package com.cook2cart.ai_service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Nutrition {
    private String calories;
    private String protein;
    private String carbohydrates;
    private String fat;
    private String vitamins;

    public Nutrition() {
    }

    public Nutrition(String calories, String protein, String carbohydrates, String fat, String vitamins) {
        this.calories = calories;
        this.protein = protein;
        this.carbohydrates = carbohydrates;
        this.fat = fat;
        this.vitamins = vitamins;
    }

    public String getCalories() {
        return calories;
    }

    public void setCalories(String calories) {
        this.calories = calories;
    }

    public String getProtein() {
        return protein;
    }

    public void setProtein(String protein) {
        this.protein = protein;
    }

    public String getCarbohydrates() {
        return carbohydrates;
    }

    public void setCarbohydrates(String carbohydrates) {
        this.carbohydrates = carbohydrates;
    }

    public String getFat() {
        return fat;
    }

    public void setFat(String fat) {
        this.fat = fat;
    }

    public String getVitamins() {
        return vitamins;
    }

    public void setVitamins(String vitamins) {
        this.vitamins = vitamins;
    }

    @Override
    public String toString() {
        return "Nutrition{" +
                "calories='" + calories + '\'' +
                ", protein='" + protein + '\'' +
                ", carbohydrates='" + carbohydrates + '\'' +
                ", fat='" + fat + '\'' +
                ", vitamins='" + vitamins + '\'' +
                '}';
    }
}
