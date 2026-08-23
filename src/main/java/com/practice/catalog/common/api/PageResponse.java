package com.practice.catalog.common.api;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long total,
        int totalPages) {

    public static <T, R> PageResponse<R> of(org.springframework.data.domain.Page<T> page,
                                            java.util.function.Function<T, R> mapper) {
        return new PageResponse<>(page.getContent().stream().map(mapper).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
