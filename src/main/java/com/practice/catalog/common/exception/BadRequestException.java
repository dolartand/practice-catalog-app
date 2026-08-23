package com.practice.catalog.common.exception;

public class BadRequestException extends DomainException {

    public BadRequestException(String message) {
        super(message);
    }
}
