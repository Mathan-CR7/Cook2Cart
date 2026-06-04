package com.cook2cart.cart_service.dto;

import java.util.List;

public class Cart {
    private List<CartItem> items;
    private int originalServings;
    private int targetServings;
    private double totalPrice;

    public Cart() {
    }

    public Cart(List<CartItem> items, int originalServings, int targetServings, double totalPrice) {
        this.items = items;
        this.originalServings = originalServings;
        this.targetServings = targetServings;
        this.totalPrice = totalPrice;
    }

    public List<CartItem> getItems() {
        return items;
    }

    public void setItems(List<CartItem> items) {
        this.items = items;
    }

    public int getOriginalServings() {
        return originalServings;
    }

    public void setOriginalServings(int originalServings) {
        this.originalServings = originalServings;
    }

    public int getTargetServings() {
        return targetServings;
    }

    public void setTargetServings(int targetServings) {
        this.targetServings = targetServings;
    }

    public double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(double totalPrice) {
        this.totalPrice = totalPrice;
    }
}
