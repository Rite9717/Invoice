package com.tax.invoice.mvp;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuthSuccessHandler implements AuthenticationSuccessHandler {
    private final AuthService authService;
    private final String frontendUrl;

    public OAuthSuccessHandler(AuthService authService, @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.authService = authService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauthUser = oauthToken.getPrincipal();
        String provider = oauthToken.getAuthorizedClientRegistrationId();
        String email = firstPresent(oauthUser.getAttribute("email"), oauthUser.getAttribute("preferred_username"));
        String name = firstPresent(oauthUser.getAttribute("name"), email);

        AppUser user = authService.oauthLogin(provider, email, name);
        String token = authService.issueToken(user);
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                .queryParam("token", token)
                .build()
                .toUriString();
        response.sendRedirect(redirectUrl);
    }

    private String firstPresent(Object primary, Object fallback) {
        if (primary != null && !primary.toString().isBlank()) {
            return primary.toString();
        }
        return fallback == null ? "oauth-user@invoice.local" : fallback.toString();
    }
}
