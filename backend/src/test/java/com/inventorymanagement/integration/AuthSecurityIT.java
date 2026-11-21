package com.inventorymanagement.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc
class AuthSecurityIT extends AbstractIntegrationTest {
    @Autowired MockMvc mvc;

    private String body(String email, String pw) { return "{\"email\":\"" + email + "\",\"password\":\"" + pw + "\",\"fullName\":\"Test User\"}"; }

    private MvcResult login(String email, String pw) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"" + email + "\",\"password\":\"" + pw + "\"}")).andReturn();
    }

    @Test
    void registerLoginAndAccessProtectedEndpoint() throws Exception {
        String email = "u" + UUID.randomUUID() + "@test.local";
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body(email, "Passw0rdOK"))).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body(email, "Passw0rdOK"))).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body("x" + email, "weak"))).andExpect(status().isBadRequest());

        assertThat(login(email, "wrong-password1").getResponse().getStatus()).isEqualTo(401);
        MvcResult ok = login(email, "Passw0rdOK");
        assertThat(ok.getResponse().getStatus()).isEqualTo(200);
        assertThat(ok.getResponse().getHeader("Set-Cookie")).contains("HttpOnly").contains("refresh_token=");
        String token = JsonPath.read(ok.getResponse().getContentAsString(), "$.data.accessToken");

        mvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andExpect(jsonPath("$.data.email").value(email));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token + "tampered")).andExpect(status().isUnauthorized());
    }

    @Test
    void customerCannotReachAdminEndpoints() throws Exception {
        String email = "u" + UUID.randomUUID() + "@test.local";
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body(email, "Passw0rdOK"))).andExpect(status().isCreated());
        String token = JsonPath.read(login(email, "Passw0rdOK").getResponse().getContentAsString(), "$.data.accessToken");
        mvc.perform(get("/api/v1/admin/inventory").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/admin/products/1").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/products")).andExpect(status().isOk());   // public catalogue
    }

    @Test
    void refreshTokenRotates_andReuseOfOldTokenRevokesTheFamily() throws Exception {
        String email = "u" + UUID.randomUUID() + "@test.local";
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body(email, "Passw0rdOK"))).andExpect(status().isCreated());
        String c1 = cookie(login(email, "Passw0rdOK"));
        MvcResult r2 = mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("refresh_token", c1))).andExpect(status().isOk()).andReturn();
        String c2 = cookie(r2);
        assertThat(c2).isNotEqualTo(c1);
        mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("refresh_token", c1))).andExpect(status().isUnauthorized());   // replay of rotated token
        mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("refresh_token", c2))).andExpect(status().isUnauthorized());   // family now revoked
    }

    private String cookie(MvcResult r) {
        String h = r.getResponse().getHeader("Set-Cookie");
        return h.substring("refresh_token=".length(), h.indexOf(';'));
    }
}
