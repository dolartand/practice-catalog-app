package com.practice.catalog.common.error;

import com.practice.catalog.common.exception.ConflictException;
import com.practice.catalog.common.exception.ResourceNotFoundException;
import com.practice.catalog.common.web.RequestIdFilter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

class ProblemDetailsShapeTest {

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new StubController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .addFilters(new RequestIdFilter())
                .build();
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void domainNotFoundReturnsProblemDetailsWithRequestId() throws Exception {
        MvcResult result = mockMvc.perform(get("/stub/missing").header(RequestIdFilter.HEADER, "test-trace-1")).andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(404);
        assertThat(result.getResponse().getContentType()).contains("application/problem+json");
        assertThat(result.getResponse().getHeader(RequestIdFilter.HEADER)).isEqualTo("test-trace-1");
        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("\"title\":\"Not Found\"");
        assertThat(body).contains("\"traceId\":\"test-trace-1\"");
    }

    @Test
    void conflictReturns409ProblemDetails() throws Exception {
        MvcResult result = mockMvc.perform(get("/stub/conflict")).andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(409);
        assertThat(result.getResponse().getContentType()).contains("application/problem+json");
    }

    @RestController
    static class StubController {

        @GetMapping("/stub/missing")
        String missing() {
            throw ResourceNotFoundException.of("Product", 42);
        }

        @GetMapping("/stub/conflict")
        String conflict() {
            throw new ConflictException("duplicate");
        }
    }
}
