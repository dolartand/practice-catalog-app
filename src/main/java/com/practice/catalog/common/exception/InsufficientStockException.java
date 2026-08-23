package com.practice.catalog.common.exception;

import java.util.List;
import java.util.UUID;

public class InsufficientStockException extends DomainException {

    private final List<StockDeficiency> deficiencies;

    public InsufficientStockException(List<StockDeficiency> deficiencies) {
        super(buildMessage(deficiencies));
        this.deficiencies = deficiencies;
    }

    public List<StockDeficiency> getDeficiencies() {
        return deficiencies;
    }

    private static String buildMessage(List<StockDeficiency> deficiencies) {
        return "Insufficient stock for " + deficiencies.size() + " item(s)";
    }

    public record StockDeficiency(UUID skuId, int requested, int available) {
    }
}
