package com.cook2cart.ai_service.dto;

import com.cook2cart.ai_service.util.IngredientsConverter;
import com.cook2cart.ai_service.util.InstructionsConverter;
import jakarta.persistence.*;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "recipes")
public class RecipeResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String languageDetected;

    @Column(columnDefinition = "TEXT")
    private String englishTranscript;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = IngredientsConverter.class)
    private List<Ingredient> ingredients;

    @Column(columnDefinition = "TEXT")
    @Convert(converter = InstructionsConverter.class)
    private List<String> instructions;

    public RecipeResponse() {
    }

    public RecipeResponse(String languageDetected, String englishTranscript, List<Ingredient> ingredients, List<String> instructions) {
        this.languageDetected = languageDetected;
        this.englishTranscript = englishTranscript;
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
                Objects.equals(ingredients, that.ingredients) &&
                Objects.equals(instructions, that.instructions);
    }

    @Override
    public int hashCode() {
        return Objects.hash(languageDetected, englishTranscript, ingredients, instructions);
    }

    @Override
    public String toString() {
        return "RecipeResponse{" +
                "languageDetected='" + languageDetected + '\'' +
                ", englishTranscript='" + englishTranscript + '\'' +
                ", ingredients=" + ingredients +
                ", instructions=" + instructions +
                '}';
    }
}
