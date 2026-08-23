package com.practice.catalog.common.exception;

public class UnauthorizedException extends DomainException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
