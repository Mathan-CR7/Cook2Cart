package com.cook2cart.ai_service.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.util.Objects;

@JsonPropertyOrder({ "name", "recipeQuantity", "recipeUnit", "quantity", "unit", "estimated", "source", "confidence" })
public class Ingredient {
    private String name;
    private Double recipeQuantity;
    private String recipeUnit;
    private Double quantity;
    private String unit;
    private boolean estimated;
    private String source;
    private double confidence;

    public Ingredient() {
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
    }

    public Ingredient(String name, Double recipeQuantity, String recipeUnit, boolean estimated, String source, double confidence) {
        this.name = name;
        this.recipeQuantity = recipeQuantity;
        this.recipeUnit = recipeUnit;
        this.estimated = estimated;
        this.source = source;
        this.confidence = confidence;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Ingredient that = (Ingredient) o;
        return estimated == that.estimated &&
                Double.compare(that.confidence, confidence) == 0 &&
                Objects.equals(name, that.name) &&
                Objects.equals(recipeQuantity, that.recipeQuantity) &&
                Objects.equals(recipeUnit, that.recipeUnit) &&
                Objects.equals(quantity, that.quantity) &&
                Objects.equals(unit, that.unit) &&
                Objects.equals(source, that.source);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, recipeQuantity, recipeUnit, quantity, unit, estimated, source, confidence);
    }

    @Override
    public String toString() {
        return "Ingredient{" +
                "name='" + name + '\'' +
                ", recipeQuantity=" + recipeQuantity +
                ", recipeUnit='" + recipeUnit + '\'' +
                ", quantity=" + quantity +
                ", unit='" + unit + '\'' +
                ", estimated=" + estimated +
                ", source='" + source + '\'' +
                ", confidence=" + confidence +
                '}';
    }
}
