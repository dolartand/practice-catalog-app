package com.practice.catalog.order;

import com.jayway.jsonpath.JsonPath;
import com.practice.catalog.order.service.CheckoutService;
import com.practice.catalog.testsupport.TestcontainersBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderFlowIT extends TestcontainersBase {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    CheckoutService checkoutService;

    record CatalogRef(String productId, String skuId) {
    }

    private String newUser(String email) throws Exception {
        MvcResult registration = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password-123\",\"firstName\":\"Test\"}"))
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

    private CatalogRef createProductWithSku(String adminAuth, int stockQty) throws Exception {
        MvcResult category = mockMvc.perform(post("/api/v1/admin/categories")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Кат\",\"slug\":\"cat-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");

        String article = "ART-" + UUID.randomUUID().toString().substring(0, 12);
        MvcResult product = mockMvc.perform(post("/api/v1/admin/products")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"categoryId\":\"%s\",\"name\":\"Сервиз %s\",\"article\":\"%s\","
                        + "\"priceCents\":20000,\"discountPercent\":10}")
                                .formatted(categoryId, article, article)))
                .andExpect(status().isCreated()).andReturn();
        String productId = JsonPath.read(product.getResponse().getContentAsString(), "$.id");

        MvcResult sku = mockMvc.perform(post("/api/v1/admin/products/" + productId + "/skus")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Базовый\",\"article\":\"SKU-" + UUID.randomUUID()
                                + "\",\"stockQty\":" + stockQty + "}"))
                .andExpect(status().isCreated()).andReturn();
        String skuId = JsonPath.read(sku.getResponse().getContentAsString(), "$.id");
        return new CatalogRef(productId, skuId);
    }

    private void addToCart(String token, String skuId, int quantity) throws Exception {
        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skuId\":\"" + skuId + "\",\"quantity\":" + quantity + "}"))
                .andExpect(status().isOk());
    }

    private int stockQtyOf(String productId) throws Exception {
        MvcResult card = mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(card.getResponse().getContentAsString(), "$.skus[0].stockQty");
    }

    private String checkoutBody() {
        return """
                {"customerName":"Иванов Иван","customerPhone":"+375291112233",
                 "deliveryCity":"Минск","deliveryAddress":"ул. Ленина, 1"}""";
    }

    @Test
    void fullCartToDeliveredCycle() throws Exception {
        String token = newUser("flow-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth, 5);

        addToCart(token, catalog.skuId(), 2);

        MvcResult cart = mockMvc.perform(get("/api/v1/cart")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].unavailable").value(false))
                .andExpect(jsonPath("$.items[0].priceCents").value(20000))
                .andExpect(jsonPath("$.items[0].priceWithDiscountCents").value(18000))
                .andExpect(jsonPath("$.totalCents").value(36000))
                .andReturn();

        String itemId = JsonPath.read(cart.getResponse().getContentAsString(), "$.items[0].id");
        mockMvc.perform(patch("/api/v1/cart/items/" + itemId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCents").value(54000));

        MvcResult created = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkoutBody()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.number").value(org.hamcrest.Matchers.matchesPattern("ORD-\\d{4}-\\d{6}")))
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.itemsTotalCents").value(54000))
                .andExpect(jsonPath("$.deliveryCents").value(0))
                .andExpect(jsonPath("$.items[0].productName").exists())
                .andExpect(jsonPath("$.items[0].priceWithDiscountCents").value(18000))
                .andReturn();
        String orderId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        assertThat(stockQtyOf(catalog.productId())).isEqualTo(2);

        mockMvc.perform(get("/api/v1/cart").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));

        mockMvc.perform(patch("/api/v1/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mockMvc.perform(patch("/api/v1/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"NEW\"}"))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/v1/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());

        mockMvc.perform(patch("/api/v1/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DELIVERED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"));

        mockMvc.perform(patch("/api/v1/admin/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + adminAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/v1/orders/" + orderId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusHistory.length()").value(3));

        MvcResult history = mockMvc.perform(get("/api/v1/orders/" + orderId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        List<String> statuses = JsonPath.read(history.getResponse().getContentAsString(),
                "$.statusHistory[*].status");
        assertThat(statuses).containsExactly("NEW", "CONFIRMED", "DELIVERED");
    }

    @Test
    void userCancelRestoresStock() throws Exception {
        String token = newUser("cancel-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth, 7);

        addToCart(token, catalog.skuId(), 3);
        MvcResult created = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkoutBody()))
                .andExpect(status().isCreated()).andReturn();
        String orderId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        assertThat(stockQtyOf(catalog.productId())).isEqualTo(4);

        mockMvc.perform(post("/api/v1/orders/" + orderId + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        assertThat(stockQtyOf(catalog.productId())).isEqualTo(7);
    }

    @Test
    void checkoutIsIdempotentByRequestId() throws Exception {
        String token = newUser("idem-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth, 10);
        addToCart(token, catalog.skuId(), 1);

        String requestId = UUID.randomUUID().toString();
        MvcResult first = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Request-Id", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkoutBody()))
                .andExpect(status().isCreated()).andReturn();

        MvcResult second = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Request-Id", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkoutBody()))
                .andExpect(status().isOk()).andReturn();

        assertThat((String) JsonPath.read(first.getResponse().getContentAsString(), "$.number"))
                .isEqualTo(JsonPath.read(second.getResponse().getContentAsString(), "$.number"));
        assertThat((String) JsonPath.read(second.getResponse().getContentAsString(), "$.status"))
                .isEqualTo("NEW");
    }

    @Test
    void emptyCartCheckoutReturns422() throws Exception {
        String token = newUser("empty-" + UUID.randomUUID() + "@test.by");

        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(checkoutBody()))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void insufficientStockRejectedOnAddUpdateAndCheckoutGuarded() throws Exception {
        String token = newUser("stock-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth, 2);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skuId\":\"" + catalog.skuId() + "\",\"quantity\":5}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.items[0].requested").value(5))
                .andExpect(jsonPath("$.items[0].available").value(2));

        addToCart(token, catalog.skuId(), 2);
        MvcResult cart = mockMvc.perform(get("/api/v1/cart").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        String itemId = JsonPath.read(cart.getResponse().getContentAsString(), "$.items[0].id");

        mockMvc.perform(patch("/api/v1/cart/items/" + itemId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":99}"))
                .andExpect(status().isUnprocessableEntity());

        mockMvc.perform(patch("/api/v1/cart/items/" + itemId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantity\":1000}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void concurrentCheckoutsDoNotOversell() throws Exception {
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth, 1);
        String tokenA = newUser("conc-a-" + UUID.randomUUID() + "@test.by");
        String tokenB = newUser("conc-b-" + UUID.randomUUID() + "@test.by");
        addToCart(tokenA, catalog.skuId(), 1);
        addToCart(tokenB, catalog.skuId(), 1);

        UUID userA = currentUserId(tokenA);
        UUID userB = currentUserId(tokenB);
        var cmd = new CheckoutService.CheckoutCommand(
                "Иванов Иван", "+375291112233", "Минск", "ул. Ленина, 1", null, null);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        List<java.util.concurrent.Future<Boolean>> results = new ArrayList<>();
        for (UUID uid : List.of(userA, userB)) {
            results.add(pool.submit(() -> {
                start.await();
                try {
                    checkoutService.checkout(uid, cmd);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }));
        }
        start.countDown();
        int successes = 0;
        for (Future<Boolean> future : results) {
            if (future.get()) {
                successes++;
            }
        }
        pool.shutdown();

        assertThat(successes).isEqualTo(1);
        assertThat(stockQtyOf(catalog.productId())).isZero();
    }

    private UUID currentUserId(String token) throws Exception {
        MvcResult me = mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn();
        return UUID.fromString(JsonPath.read(me.getResponse().getContentAsString(), "$.id"));
    }

    @Test
    void favoritesPutDeleteAndList() throws Exception {
        String token = newUser("fav-" + UUID.randomUUID() + "@test.by");
        String adminAuth = adminToken();
        CatalogRef catalog = createProductWithSku(adminAuth, 1);

        mockMvc.perform(put("/api/v1/favorites/" + catalog.productId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(put("/api/v1/favorites/" + catalog.productId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        MvcResult list = mockMvc.perform(get("/api/v1/favorites")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        var favBody = new tools.jackson.databind.json.JsonMapper()
                .readTree(list.getResponse().getContentAsString());
        assertThat(favBody.at("/total").asInt()).isEqualTo(1);
        assertThat(favBody.at("/items/0/id").asString()).isEqualTo(catalog.productId());

        mockMvc.perform(delete("/api/v1/favorites/" + catalog.productId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/favorites").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
    }
}
