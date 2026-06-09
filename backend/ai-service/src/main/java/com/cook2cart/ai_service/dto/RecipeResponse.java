package com.cook2cart.ai_service.dto;

import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class RecipeResponse {

    private Long id;

    private String languageDetected;

    private String englishTranscript;

    private Double confidenceScore;

    private List<Ingredient> ingredients;

    private List<String> instructions;

    private Nutrition nutrition;

    public RecipeResponse() {
    }

    public Nutrition getNutrition() {
        return nutrition;
    }

    public void setNutrition(Nutrition nutrition) {
        this.nutrition = nutrition;
    }

    public RecipeResponse(String languageDetected, String englishTranscript, List<Ingredient> ingredients, List<String> instructions) {
        this.languageDetected = languageDetected;
        this.englishTranscript = englishTranscript;
        this.ingredients = ingredients;
        this.instructions = instructions;
    }

    public RecipeResponse(String languageDetected, String englishTranscript, Double confidenceScore, List<Ingredient> ingredients, List<String> instructions) {
        this.languageDetected = languageDetected;
        this.englishTranscript = englishTranscript;
        this.confidenceScore = confidenceScore;
        this.ingredients = ingredients;
        this.instructions = instructions;
    }

    public String getLanguageDetected() {
        return languageDetected;
    }

    public void setLanguageDetected(String languageDetected) {
        this.languageDetected = languageDetected;
    }

    public String getEnglishTranscript() {
        return englishTranscript;
    }

    public void setEnglishTranscript(String englishTranscript) {
        this.englishTranscript = englishTranscript;
    }

    public Double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public List<Ingredient> getIngredients() {
        return ingredients;
    }

    public void setIngredients(List<Ingredient> ingredients) {
        this.ingredients = ingredients;
    }

    public List<String> getInstructions() {
        return instructions;
    }

    public void setInstructions(List<String> instructions) {
        this.instructions = instructions;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RecipeResponse that = (RecipeResponse) o;
        return Objects.equals(languageDetected, that.languageDetected) &&
                Objects.equals(englishTranscript, that.englishTranscript) &&
                Objects.equals(confidenceScore, that.confidenceScore) &&
                Objects.equals(ingredients, that.ingredients) &&
                Objects.equals(instructions, that.instructions);
    }

    @Override
    public int hashCode() {
        return Objects.hash(languageDetected, englishTranscript, confidenceScore, ingredients, instructions);
    }

    @Override
    public String toString() {
        return "RecipeResponse{" +
                "languageDetected='" + languageDetected + '\'' +
                ", englishTranscript='" + englishTranscript + '\'' +
                ", confidenceScore=" + confidenceScore +
                ", ingredients=" + ingredients +
                ", instructions=" + instructions +
                '}';
    }
}
