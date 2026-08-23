package com.practice.catalog.common.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Component
public class CacheHeaderInterceptor implements HandlerInterceptor {

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response,
                           Object handler, org.springframework.web.servlet.ModelAndView modelAndView) {
        if (!StringUtils.hasText(request.getHeader(HttpHeaders.AUTHORIZATION))) {
            return;
        }
        String cacheControl = response.getHeader(HttpHeaders.CACHE_CONTROL);
        if (!StringUtils.hasText(cacheControl)) {
            response.setHeader(HttpHeaders.CACHE_CONTROL, "private, no-store");
        }
    }

    @org.springframework.context.annotation.Configuration
    public static class Registration implements WebMvcConfigurer {

        private final CacheHeaderInterceptor interceptor;

        public Registration(CacheHeaderInterceptor interceptor) {
            this.interceptor = interceptor;
        }

        @Override
        public void addInterceptors(InterceptorRegistry registry) {
            registry.addInterceptor(interceptor).addPathPatterns("/api/**");
        }
    }
}
