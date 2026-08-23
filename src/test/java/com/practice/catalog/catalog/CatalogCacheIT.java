package com.practice.catalog.catalog;

import com.jayway.jsonpath.JsonPath;
import com.practice.catalog.testsupport.TestcontainersBase;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CatalogCacheIT extends TestcontainersBase {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MeterRegistry meterRegistry;

    private String adminToken() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@test.local\",\"password\":\"admin-password-123\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    record Fixture(String productId, String skuId, String slug, String article) {
    }

    private Fixture createProduct(String adminAuth) throws Exception {
        String slug = "cache-" + UUID.randomUUID();
        MvcResult category = mockMvc.perform(post("/api/v1/admin/categories")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Кэш-кат\",\"slug\":\"" + slug + "\"}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
                .andReturn();
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        String article = "CCH-" + UUID.randomUUID().toString().substring(0, 12);
        MvcResult product = mockMvc.perform(post("/api/v1/admin/products")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"categoryId\":\"%s\",\"name\":\"Товар %s\",\"article\":\"%s\","
                                + "\"priceCents\":7000,\"discountPercent\":0}")
                                .formatted(categoryId, article, article)))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
                .andReturn();
        String productId = JsonPath.read(product.getResponse().getContentAsString(), "$.id");
        MvcResult sku = mockMvc.perform(post("/api/v1/admin/products/" + productId + "/skus")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"S\",\"article\":\"" + article + "-1\",\"stockQty\":4}"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
                .andReturn();
        return new Fixture(productId,
                JsonPath.read(sku.getResponse().getContentAsString(), "$.id"), slug, article);
    }

    @Test
    void treeIsCachedThenInvalidatedByCategoryCrud() throws Exception {
        String adminAuth = adminToken();

        double missesBefore = counter("catalog.cache.misses", "tree");
        mockMvc.perform(get("/api/v1/categories")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/categories")).andExpect(status().isOk());

        assertThat(counter("catalog.cache.hits", "tree")).isGreaterThanOrEqualTo(1);
        assertThat(counter("catalog.cache.misses", "tree") - missesBefore).isEqualTo(1);

        mockMvc.perform(post("/api/v1/admin/categories")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Свежая\",\"slug\":\"fresh-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated());

        assertThat(cacheKeyExists("catalog:categories:tree")).isFalse();
    }

    @Test
    void productListCachedAndStockAlwaysLive() throws Exception {
        String adminAuth = adminToken();
        Fixture fixture = createProduct(adminAuth);

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(get("/api/v1/products").param("q", fixture.article()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(1))
                    .andExpect(jsonPath("$.items[0].inStock").value(true))
                    .andExpect(jsonPath("$.items[0].priceWithDiscountCents").value(7000));
        }
        assertThat(counter("catalog.cache.misses", "list")).isGreaterThanOrEqualTo(1);
        assertThat(counter("catalog.cache.hits", "list")).isGreaterThanOrEqualTo(1);

        mockMvc.perform(get("/api/v1/products")
                        .param("q", fixture.article())
                        .param("inStock", "true"))
                .andExpect(status().isOk())
                .andExpect(header("no-store"));

        mockMvc.perform(patch("/api/v1/admin/skus/" + fixture.skuId())
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stockQty\":0}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/products").param("q", fixture.article()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].inStock").value(false));
    }

    @Test
    void cardCachedWithEtagAndLiveStockAndNegativeCache() throws Exception {
        String adminAuth = adminToken();
        Fixture fixture = createProduct(adminAuth);

        MvcResult first = mockMvc.perform(get("/api/v1/products/" + fixture.productId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skus[0].stockQty").value(4))
                .andExpect(result -> assertThat(
                        result.getResponse().getHeader("ETag")).isNotBlank())
                .andExpect(result -> assertThat(
                        result.getResponse().getHeader("Cache-Control")).isEqualTo("no-store"))
                .andReturn();
        String etag = first.getResponse().getHeader("ETag");

        mockMvc.perform(patch("/api/v1/admin/skus/" + fixture.skuId())
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stockQty\":9}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/products/" + fixture.productId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skus[0].stockQty").value(9));

        mockMvc.perform(get("/api/v1/products/" + fixture.productId())
                        .header("If-None-Match", etag))
                .andExpect(status().isNotModified());

        String missing = UUID.randomUUID().toString();
        mockMvc.perform(get("/api/v1/products/" + missing)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/products/" + missing)).andExpect(status().isNotFound());
        assertThat(cacheKeyExists("catalog:product:" + missing)).isTrue();
    }

    private double counter(String name, String kind) {
        var meter = meterRegistry.find(name).tag("kind", kind).counter();
        return meter == null ? 0 : meter.count();
    }

    @Autowired
    com.practice.catalog.catalog.service.CatalogCache catalogCache;

    private boolean cacheKeyExists(String key) {
        return catalogCache.existsInRedis(key);
    }

    private static org.springframework.test.web.servlet.ResultMatcher header(String value) {
        return result -> assertThat(
                result.getResponse().getHeader("Cache-Control")).isEqualTo(value);
    }
}
