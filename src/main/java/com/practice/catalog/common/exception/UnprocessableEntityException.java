package com.practice.catalog.common.exception;

public class UnprocessableEntityException extends DomainException {

    public UnprocessableEntityException(String message) {
        super(message);
    }
}
