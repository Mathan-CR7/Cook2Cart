package com.cook2cart.productservice.exception;

public class ExternalProviderException extends RuntimeException {
    public ExternalProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
