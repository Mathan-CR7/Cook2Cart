package com.cook2cart.ai_service.dto;

public class StoreProduct {
    private String id;
    private String name;
    private String brand;
    private String size;
    private double price;
    private String category;

    public StoreProduct() {
    }

    public StoreProduct(String id, String name, String brand, String size, double price, String category) {
        this.id = id;
        this.name = name;
        this.brand = brand;
        this.size = size;
        this.price = price;
        this.category = category;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
