package com.practice.catalog.auth.api;

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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIT extends TestcontainersBase {

    @Autowired
    MockMvc mockMvc;

    private static final String EMAIL = "flow@test.by";
    private static final String PASSWORD = "password-123";

    private MvcResult performPost(String url, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andReturn();
    }

    private String toJson(Map<String, Object> body) {
        return new tools.jackson.databind.json.JsonMapper().writeValueAsString(body);
    }

    private String string(MvcResult result, String jsonPathExpr) {
        try {
            return JsonPath.read(result.getResponse().getContentAsString(), jsonPathExpr);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    private Integer integer(MvcResult result, String jsonPathExpr) {
        try {
            return JsonPath.read(result.getResponse().getContentAsString(), jsonPathExpr);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void registerLoginRefreshLogoutFullCycle() throws Exception {
        MvcResult registration = performPost("/api/v1/auth/register", Map.of(
                "email", EMAIL,
                "password", PASSWORD,
                "firstName", "Ivan",
                "lastName", "Ivanov",
                "phone", "+375291112233"));
        assertThat(registration.getResponse().getStatus()).isEqualTo(201);
        assertThat(string(registration, "$.accessToken")).isNotBlank();
        assertThat(integer(registration, "$.expiresIn")).isEqualTo(900);
        assertThat(integer(registration, "$.refreshExpiresIn")).isEqualTo(2592000);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + string(registration, "$.accessToken")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.firstName").value("Ivan"));

        MvcResult login = performPost("/api/v1/auth/login", Map.of("email", EMAIL, "password", PASSWORD));
        assertThat(login.getResponse().getStatus()).isEqualTo(200);

        MvcResult refreshed = performPost("/api/v1/auth/refresh",
                Map.of("refreshToken", string(registration, "$.refreshToken")));
        assertThat(refreshed.getResponse().getStatus()).isEqualTo(200);
        assertThat(string(refreshed, "$.refreshToken")).isNotEqualTo(string(registration, "$.refreshToken"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("refreshToken", string(registration, "$.refreshToken")))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("refreshToken", string(refreshed, "$.refreshToken")))))
                .andExpect(status().isUnauthorized());

        MvcResult relogin = performPost("/api/v1/auth/login", Map.of("email", EMAIL, "password", PASSWORD));
        String accessToken = string(relogin, "$.accessToken");
        String refreshToken = string(relogin, "$.refreshToken");

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("refreshToken", refreshToken))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("refreshToken", refreshToken))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateEmailRegistrationReturns409() throws Exception {
        performPost("/api/v1/auth/register", Map.of(
                "email", "dup-flow@test.by",
                "password", PASSWORD,
                "firstName", "Petr"));
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of(
                                "email", "dup-flow@test.by",
                                "password", PASSWORD,
                                "firstName", "Petr"))))
                .andExpect(status().isConflict());
    }

    @Test
    void invalidLoginReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", "nobody@test.by", "password", "whatever123"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("Unauthorized"));
    }

    @Test
    void changePasswordRevokesAllSessions() throws Exception {
        performPost("/api/v1/auth/register", Map.of(
                "email", "pwd-flow@test.by",
                "password", PASSWORD,
                "firstName", "Anna"));
        MvcResult firstSession = performPost("/api/v1/auth/login",
                Map.of("email", "pwd-flow@test.by", "password", PASSWORD));
        MvcResult secondSession = performPost("/api/v1/auth/login",
                Map.of("email", "pwd-flow@test.by", "password", PASSWORD));
        String token = string(firstSession, "$.accessToken");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of(
                                "currentPassword", PASSWORD,
                                "newPassword", "new-password-9",
                                "newPasswordConfirm", "different"))))
                .andExpect(status().isUnprocessableEntity());

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of(
                                "currentPassword", "wrong-current",
                                "newPassword", "new-password-9",
                                "newPasswordConfirm", "new-password-9"))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of(
                                "currentPassword", PASSWORD,
                                "newPassword", "new-password-9",
                                "newPasswordConfirm", "new-password-9"))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("refreshToken", string(secondSession, "$.refreshToken")))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", "pwd-flow@test.by", "password", "new-password-9"))))
                .andExpect(status().isOk());
    }

    @Test
    void updateProfilePartialSemantics() throws Exception {
        performPost("/api/v1/auth/register", Map.of(
                "email", "profile-flow@test.by",
                "password", PASSWORD,
                "firstName", "Maria",
                "phone", "+375290000000"));
        MvcResult session = performPost("/api/v1/auth/login",
                Map.of("email", "profile-flow@test.by", "password", PASSWORD));
        String authHeader = "Bearer " + string(session, "$.accessToken");

        mockMvc.perform(patch("/api/v1/auth/me")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", authHeader))
                .andExpect(jsonPath("$.phone").value("+375290000000"));

        mockMvc.perform(patch("/api/v1/auth/me")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\": null, \"firstName\": \"Mariya\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", authHeader))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Mariya"))
                .andExpect(jsonPath("$.phone").doesNotExist());
    }

    @Test
    void protectedEndpointWithoutTokenReturnsProblemDetails() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.type").exists())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void validationErrorsReturn400WithErrorsMap() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", "not-an-email", "password", "short", "firstName", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email[0]").exists())
                .andExpect(jsonPath("$.errors.password[0]").exists());
    }
}
