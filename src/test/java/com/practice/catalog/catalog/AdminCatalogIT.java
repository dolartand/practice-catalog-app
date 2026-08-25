package com.practice.catalog.catalog;

import com.jayway.jsonpath.JsonPath;
import com.practice.catalog.testsupport.TestcontainersBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminCatalogIT extends TestcontainersBase {

    @Autowired
    MockMvc mockMvc;

    private static final byte[] PNG_BYTES = new byte[]{
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 73, 72, 68, 82
    };

    private String admin() {
        return "admin";
    }

    private MvcResult createCategory(String slug) throws Exception {
        return mockMvc.perform(post("/api/v1/admin/categories")
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Посуда\",\"slug\":\"" + slug + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private String createProduct(UUID categoryId, String article) throws Exception {
        return createProductNamed(categoryId, article, "Чайный сервиз «Славянский»");
    }

    private String createProductNamed(UUID categoryId, String article, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/products")
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"categoryId":"%s","name":"%s","article":"%s",
                                 "series":"Славянский","productType":"сервиз","material":"фарфор",
                                 "priceCents":120000,"discountPercent":15}
                                """.formatted(categoryId, name, article)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priceWithDiscountCents").value(102000))
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }

    @Test
    void adminCreatesCatalogAndPublicSeesIt() throws Exception {
        MvcResult category = createCategory("pub-" + UUID.randomUUID());
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");

        String uniqueName = "Публичный сервиз Q" + UUID.randomUUID();
        String productId = createProductNamed(UUID.fromString(categoryId), "PUB-" + UUID.randomUUID(), uniqueName);

        MvcResult sku = mockMvc.perform(post("/api/v1/admin/products/" + productId + "/skus")
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"На 6 персон\",\"article\":\"SK-" + UUID.randomUUID()
                                + "\",\"stockQty\":5}"))
                .andExpect(status().isCreated())
                .andReturn();

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.png", MediaType.IMAGE_PNG_VALUE, PNG_BYTES);
        mockMvc.perform(multipart("/api/v1/admin/products/" + productId + "/images")
                        .file(file)
                        .param("position", "0")
                        .with(req -> {
                            req.setMethod("POST");
                            return req;
                        })
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.containsString(MINIO_BUCKET)));

        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + categoryId + "')]").exists());

        MvcResult search = mockMvc.perform(get("/api/v1/products")
                        .param("q", "Q" + UUID.randomUUID().toString().substring(0, 8))
                        .param("sort", "price_asc"))
                .andExpect(status().isOk())
                .andReturn();
        String qToken = uniqueName.split("Q")[1].substring(0, 8);
        MvcResult scopedSearch = mockMvc.perform(get("/api/v1/products")
                        .param("q", qToken)
                        .param("sort", "price_asc"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(Integer.valueOf(JsonPath.read(scopedSearch.getResponse().getContentAsString(), "$.total").toString()))
                .isEqualTo(1);
        Boolean inStock = JsonPath.read(scopedSearch.getResponse().getContentAsString(), "$.items[0].inStock");
        assertThat(inStock).isTrue();
        String mainImageUrl = JsonPath.read(scopedSearch.getResponse().getContentAsString(),
                "$.items[0].mainImageUrl");
        assertThat(mainImageUrl).isNotBlank();

        mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skus.length()").value(1))
                .andExpect(jsonPath("$.images.length()").value(1))
                .andExpect(jsonPath("$.skus[0].priceWithDiscountCents").value(102000));
    }

    @Test
    void nonAdminCannotUseAdminEndpoints() throws Exception {
        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"slug\":\"x-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/admin/categories")
                        .with(user("plain").roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"slug\":\"x-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/products")
                        .with(user("plain").roles("USER")))
                .andExpect(status().isOk());
    }

    @Test
    void deleteCategoryWithProductsReturns409() throws Exception {
        MvcResult category = createCategory("del-" + UUID.randomUUID());
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        createProduct(UUID.fromString(categoryId), "DEL-" + UUID.randomUUID());

        mockMvc.perform(delete("/api/v1/admin/categories/" + categoryId)
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isConflict());
    }

    @Test
    void productSoftDeleteHidesFromPublicButKeepsAdminAccess() throws Exception {
        MvcResult category = createCategory("soft-" + UUID.randomUUID());
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        String productId = createProduct(UUID.fromString(categoryId), "SOFT-" + UUID.randomUUID());

        mockMvc.perform(delete("/api/v1/admin/products/" + productId)
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isNotFound());
    }

    @Test
    void imageCanBeUpdatedAndDeleted() throws Exception {
        MvcResult category = createCategory("img-" + UUID.randomUUID());
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        String productId = createProduct(UUID.fromString(categoryId), "IMG-" + UUID.randomUUID());

        MockMultipartFile file = new MockMultipartFile(
                "file", "one.png", MediaType.IMAGE_PNG_VALUE, PNG_BYTES);
        MvcResult upload = mockMvc.perform(multipart("/api/v1/admin/products/" + productId + "/images")
                        .file(file).param("position", "0")
                        .with(req -> { req.setMethod("POST"); return req; })
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isCreated())
                .andReturn();
        String imageId = JsonPath.read(upload.getResponse().getContentAsString(), "$.id");

        MockMultipartFile second = new MockMultipartFile(
                "file", "two.png", MediaType.IMAGE_PNG_VALUE, PNG_BYTES);
        MvcResult upload2 = mockMvc.perform(multipart("/api/v1/admin/products/" + productId + "/images")
                        .file(second).param("position", "1").param("isMain", "true")
                        .with(req -> { req.setMethod("POST"); return req; })
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isMain").value(true))
                .andReturn();

        mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images[0].isMain").value(false))
                .andExpect(jsonPath("$.images[1].isMain").value(true));

        mockMvc.perform(patch("/api/v1/admin/images/" + imageId)
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"position\":5,\"isMain\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.position").value(5));

        mockMvc.perform(delete("/api/v1/admin/images/" + imageId)
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images.length()").value(1));

        assertThat(upload2.getResponse().getStatus()).isEqualTo(201);
    }

    @Test
    void skuDeactivationInsteadOfRemoval() throws Exception {
        MvcResult category = createCategory("sku-" + UUID.randomUUID());
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        String productId = createProduct(UUID.fromString(categoryId), "SKU-" + UUID.randomUUID());
        String article = "SKA-" + UUID.randomUUID();

        MvcResult created = mockMvc.perform(post("/api/v1/admin/products/" + productId + "/skus")
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Вариант\",\"article\":\"" + article + "\",\"stockQty\":3}"))
                .andExpect(status().isCreated())
                .andReturn();
        String skuId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(patch("/api/v1/admin/skus/" + skuId)
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stockQty\":10,\"priceCents\":90000,\"discountPercent\":50}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockQty").value(10))
                .andExpect(jsonPath("$.priceWithDiscountCents").value(45000));

        mockMvc.perform(patch("/api/v1/admin/skus/" + skuId)
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"discountPercent\":150}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/v1/admin/skus/" + skuId)
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skus.length()").value(0));

        mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isOk());
    }

    @Test
    void adminProductListAndCardWorkAcrossStatuses() throws Exception {
        MvcResult category = createCategory("stat-" + UUID.randomUUID());
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        String article = "STA-" + UUID.randomUUID();
        String productId = createProduct(UUID.fromString(categoryId), article);

        mockMvc.perform(get("/api/v1/admin/products")
                        .with(user(admin()).roles("ADMIN"))
                        .param("status", "ACTIVE").param("q", article))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].isActive").value(true));

        mockMvc.perform(patch("/api/v1/admin/products/" + productId)
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));

        mockMvc.perform(get("/api/v1/admin/products")
                        .with(user(admin()).roles("ADMIN"))
                        .param("status", "ACTIVE").param("q", article))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));

        mockMvc.perform(get("/api/v1/admin/products")
                        .with(user(admin()).roles("ADMIN"))
                        .param("status", "INACTIVE").param("q", article))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(productId))
                .andExpect(jsonPath("$.items[0].isActive").value(false));

        mockMvc.perform(get("/api/v1/admin/products/" + productId)
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(productId))
                .andExpect(jsonPath("$.isActive").value(false))
                .andExpect(jsonPath("$.deletedAt").doesNotExist());

        mockMvc.perform(patch("/api/v1/admin/products/" + productId)
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));

        mockMvc.perform(get("/api/v1/admin/products")
                        .with(user(admin()).roles("ADMIN"))
                        .param("status", "ACTIVE").param("q", article))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void adminSeesSoftDeletedProductsAndAdminCard() throws Exception {
        MvcResult category = createCategory("sdel-" + UUID.randomUUID());
        String categoryId = JsonPath.read(category.getResponse().getContentAsString(), "$.id");
        String article = "SDE-" + UUID.randomUUID();
        String productId = createProduct(UUID.fromString(categoryId), article);

        mockMvc.perform(delete("/api/v1/admin/products/" + productId)
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/products/" + productId))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/admin/products")
                        .with(user(admin()).roles("ADMIN"))
                        .param("status", "DELETED").param("q", article))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(productId))
                .andExpect(jsonPath("$.items[0].deletedAt").exists());

        mockMvc.perform(get("/api/v1/admin/products/" + productId)
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true))
                .andExpect(jsonPath("$.deletedAt").exists());
    }

    @Test
    void adminFullTreeShowsInactiveCategoriesWithFlags() throws Exception {
        MvcResult parent = createCategory("ftree-" + UUID.randomUUID());
        String parentId = JsonPath.read(parent.getResponse().getContentAsString(), "$.id");

        String childSlug = "fchild-" + UUID.randomUUID();
        mockMvc.perform(post("/api/v1/admin/categories")
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Дети\",\"slug\":\"" + childSlug
                                + "\",\"parentId\":\"" + parentId + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        mockMvc.perform(patch("/api/v1/admin/categories/" + parentId)
                        .with(user(admin()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + parentId + "')]").doesNotExist());

        MvcResult tree = mockMvc.perform(get("/api/v1/admin/categories")
                        .with(user(admin()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andReturn();
        String response = tree.getResponse().getContentAsString();
        assertThat(response).contains(parentId);
        assertThat(response).contains("\"isActive\":false");
        assertThat(response).contains(childSlug);
    }
}
