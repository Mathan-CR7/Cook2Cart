package com.cook2cart.ai_service.dto;

import java.util.List;
import java.util.Objects;

public class RecipeResponse {
    private String languageDetected;
    private String englishTranscript;
    private List<Ingredient> ingredients;

    public RecipeResponse() {
    }

    public RecipeResponse(String languageDetected, String englishTranscript, List<Ingredient> ingredients) {
        this.languageDetected = languageDetected;
        this.englishTranscript = englishTranscript;
        this.ingredients = ingredients;
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

    public List<Ingredient> getIngredients() {
        return ingredients;
    }

    public void setIngredients(List<Ingredient> ingredients) {
        this.ingredients = ingredients;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RecipeResponse that = (RecipeResponse) o;
        return Objects.equals(languageDetected, that.languageDetected) &&
                Objects.equals(englishTranscript, that.englishTranscript) &&
                Objects.equals(ingredients, that.ingredients);
    }

    @Override
    public int hashCode() {
        return Objects.hash(languageDetected, englishTranscript, ingredients);
    }

    @Override
    public String toString() {
        return "RecipeResponse{" +
                "languageDetected='" + languageDetected + '\'' +
                ", englishTranscript='" + englishTranscript + '\'' +
                ", ingredients=" + ingredients +
                '}';
    }
}
