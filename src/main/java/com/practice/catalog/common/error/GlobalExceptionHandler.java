package com.practice.catalog.common.error;

import com.practice.catalog.common.exception.BadRequestException;
import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.ForbiddenException;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import com.practice.catalog.common.exception.UnauthorizedException;
import com.practice.catalog.common.exception.UnprocessableEntityException;
import com.practice.catalog.common.web.RequestIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail handleConflict(ConflictException ex) {
        return problem(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ProblemDetail handleForbidden(ForbiddenException ex) {
        return problem(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ProblemDetail handleUnauthorized(UnauthorizedException ex) {
        return problem(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(UnprocessableEntityException.class)
    public ProblemDetail handleUnprocessable(UnprocessableEntityException ex) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    }

    @ExceptionHandler(com.practice.catalog.common.exception.InsufficientStockException.class)
    public ProblemDetail handleInsufficientStock(com.practice.catalog.common.exception.InsufficientStockException ex) {
        ProblemDetail pd = problem(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        pd.setProperty("items", ex.getDeficiencies().stream()
                .map(d -> new StockItem(d.skuId(), d.requested(), d.available()))
                .toList());
        return pd;
    }

    private record StockItem(java.util.UUID skuId, int requested, int available) {
    }

    @ExceptionHandler(BadRequestException.class)
    public ProblemDetail handleBadRequestDomain(BadRequestException ex) {
        return problem(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, "Request validation failed");
        Map<String, List<String>> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fe -> errors.computeIfAbsent(fe.getField(), k -> new ArrayList<>())
                        .add(fe.getDefaultMessage()));
        pd.setProperty("errors", errors);
        return pd;
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ProblemDetail handleBadRequest(Exception ex) {
        Throwable cause = ex.getCause();
        while (cause != null) {
            if (cause instanceof jakarta.validation.ConstraintViolationException cve) {
                ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, "Request validation failed");
                Map<String, List<String>> errors = new LinkedHashMap<>();
                cve.getConstraintViolations()
                        .forEach(v -> errors.computeIfAbsent(v.getPropertyPath().toString(), k -> new ArrayList<>())
                                .add(v.getMessage()));
                pd.setProperty("errors", errors);
                return pd;
            }
            cause = cause.getCause();
        }
        log.debug("Bad request", ex);
        return problem(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail handleNoResource(NoResourceFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "Resource not found");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
    }

    private ProblemDetail problem(HttpStatus status, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(status.getReasonPhrase());
        String traceId = RequestIdFilter.currentTraceId();
        if (traceId != null) {
            pd.setProperty("traceId", traceId);
        }
        return pd;
    }
}
