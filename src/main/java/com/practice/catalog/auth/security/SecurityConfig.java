package com.practice.catalog.auth.security;

import com.practice.catalog.auth.domain.UserRepository;
import com.practice.catalog.auth.service.JwtProvider;
import com.practice.catalog.common.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationFilter jwtAuthenticationFilter,
                                                   ObjectMapper objectMapper) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/v1/auth/register",
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/actuator/**",
                                "/error").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET,
                                "/api/v1/categories/**",
                                "/api/v1/products/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.HEAD,
                                "/api/v1/categories/**",
                                "/api/v1/products/**").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(new ProblemDetailsEntryPoint(objectMapper))
                        .accessDeniedHandler(new ProblemDetailsAccessDeniedHandler(objectMapper)))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    private static void writeProblem(HttpServletResponse response, ObjectMapper objectMapper,
                                     HttpStatus status, String detail) throws java.io.IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setType(java.net.URI.create("about:blank"));
        pd.setTitle(status.getReasonPhrase());
        String traceId = RequestIdFilter.currentTraceId();
        if (traceId != null) {
            pd.setProperty("traceId", traceId);
        }
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), pd);
    }

    static final class ProblemDetailsEntryPoint implements
            org.springframework.security.web.AuthenticationEntryPoint {

        private final ObjectMapper objectMapper;

        ProblemDetailsEntryPoint(ObjectMapper objectMapper) {
            this.objectMapper = objectMapper;
        }

        @Override
        public void commence(jakarta.servlet.http.HttpServletRequest request,
                             jakarta.servlet.http.HttpServletResponse response,
                             org.springframework.security.core.AuthenticationException authException)
                throws java.io.IOException {
            writeProblem(response, objectMapper, HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    static final class ProblemDetailsAccessDeniedHandler implements
            org.springframework.security.web.access.AccessDeniedHandler {

        private final ObjectMapper objectMapper;

        ProblemDetailsAccessDeniedHandler(ObjectMapper objectMapper) {
            this.objectMapper = objectMapper;
        }

        @Override
        public void handle(jakarta.servlet.http.HttpServletRequest request,
                           jakarta.servlet.http.HttpServletResponse response,
                           org.springframework.security.access.AccessDeniedException accessDeniedException)
                throws java.io.IOException {
            writeProblem(response, objectMapper, HttpStatus.FORBIDDEN, "Insufficient permissions");
        }
    }
}
