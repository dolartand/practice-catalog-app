package com.practice.catalog.review;

import com.jayway.jsonpath.JsonPath;
import com.practice.catalog.testsupport.TestcontainersBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReviewFlowIT extends TestcontainersBase {

    @Autowired
    MockMvc mockMvc;

    private String newUser(String email) throws Exception {
        MvcResult registration = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password-123\",\"firstName\":\"Ольга\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(registration.getResponse().getContentAsString(), "$.accessToken");
    }

    private String adminToken() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@test.local\",\"password\":\"admin-password-123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    record CatalogRef(String productId, String skuId) {
    }

    private CatalogRef createProductWithSku(String adminAuth) throws Exception {
        MvcResult category = mockMvc.perform(post("/api/v1/admin/categories")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Кат\",\"slug\":\"rev-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        String article = "REV-" + UUID.randomUUID().toString().substring(0, 12);
        MvcResult product = mockMvc.perform(post("/api/v1/admin/products")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"categoryId\":\"%s\",\"name\":\"Чашка %s\",\"article\":\"%s\","
                                + "\"priceCents\":5000,\"discountPercent\":0}")
                                .formatted(categoryId, article, article)))
                .andExpect(status().isCreated()).andReturn();
        String productId = JsonPath.read(product.getResponse().getContentAsString(), "$.id");
        MvcResult sku = mockMvc.perform(post("/api/v1/admin/products/" + productId + "/skus")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Базовая\",\"article\":\"RSKU-" + UUID.randomUUID()
                                + "\",\"stockQty\":10}"))
                .andExpect(status().isCreated()).andReturn();
        return new CatalogRef(productId, JsonPath.read(sku.getResponse().getContentAsString(), "$.id"));
    }

    private void buyAndDeliver(String token, String adminAuth, CatalogRef catalog) throws Exception {
        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skuId\":\"" + catalog.skuId() + "\",\"quantity\":1}"))
                .andExpect(status().isOk());
        MvcResult order = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"Иванов Иван\",\"customerPhone\":\"+375291112233\","
                                + "\"deliveryCity\":\"Минск\",\"deliveryAddress\":\"Ленина 1\"}"))
                .andExpect(status().isCreated()).andReturn();
        String orderId = JsonPath.read(order.getResponse().getContentAsString(), "$.id");
        mockMvc.perform(patch("/api/v1/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/v1/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DELIVERED\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void nonBuyerIsForbiddenToReview() throws Exception {
        String outsider = newUser("out-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth);

        mockMvc.perform(post("/api/v1/products/" + catalog.productId() + "/reviews")
                        .header("Authorization", "Bearer " + outsider)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"text\":\"Не покупал, но скажу\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Forbidden"));
    }

    @Test
    void buyerReviewLifecycleWithModerationAndRating() throws Exception {
        String buyerToken = newUser("buyer-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth);
        buyAndDeliver(buyerToken, adminAuth, catalog);

        MvcResult created = mockMvc.perform(post("/api/v1/products/" + catalog.productId() + "/reviews")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"text\":\"Отличная чашка\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.moderated").value(false))
                .andReturn();
        String reviewId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/v1/products/" + catalog.productId() + "/reviews")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"text\":\"Ещё раз\"}"))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/v1/products/" + catalog.productId() + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));

        mockMvc.perform(get("/api/v1/products/" + catalog.productId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ratingCount").value(0));

        mockMvc.perform(patch("/api/v1/reviews/" + reviewId)
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"text\":\"Хорошая, но не отличная\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(4));

        mockMvc.perform(patch("/api/v1/admin/reviews/" + reviewId + "/moderation")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isModerated\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.moderated").value(true));

        MvcResult publicList = mockMvc.perform(get("/api/v1/products/"
                        + catalog.productId() + "/reviews"))
                .andExpect(status().isOk())
                .andReturn();
        var listBody = new tools.jackson.databind.json.JsonMapper()
                .readTree(publicList.getResponse().getContentAsString());
        assertThat(listBody.at("/total").asInt()).isEqualTo(1);
        assertThat(listBody.at("/items/0/userFirstName").asString()).isEqualTo("Ольга");

        mockMvc.perform(get("/api/v1/products/" + catalog.productId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ratingAverage").value(4.0))
                .andExpect(jsonPath("$.ratingCount").value(1));

        mockMvc.perform(get("/api/v1/admin/reviews?isModerated=false")
                        .header("Authorization", "Bearer " + adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));

        mockMvc.perform(patch("/api/v1/admin/reviews/" + reviewId + "/moderation")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isModerated\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/products/" + catalog.productId() + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));

        mockMvc.perform(get("/api/v1/products/" + catalog.productId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ratingCount").value(0));

        mockMvc.perform(delete("/api/v1/reviews/" + reviewId)
                        .header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void otherUserCannotEditForeignReview() throws Exception {
        String buyerToken = newUser("fbuyer-" + UUID.randomUUID() + "@test.by");
        String stranger = newUser("stranger-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth);
        buyAndDeliver(buyerToken, adminAuth, catalog);

        MvcResult created = mockMvc.perform(post("/api/v1/products/" + catalog.productId() + "/reviews")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":3,\"text\":\"Нормально\"}"))
                .andExpect(status().isCreated()).andReturn();
        String reviewId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(patch("/api/v1/reviews/" + reviewId)
                        .header("Authorization", "Bearer " + stranger)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"взлом\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/reviews/" + reviewId)
                        .header("Authorization", "Bearer " + stranger))
                .andExpect(status().isNotFound());
    }
}
