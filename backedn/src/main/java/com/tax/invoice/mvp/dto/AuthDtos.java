package com.tax.invoice.mvp.dto;

import com.tax.invoice.mvp.Role;

public class AuthDtos {
    public record LoginRequest(String email, String password) {
    }

    public record RegisterRequest(String name, String email, String password, Role role, Long clientId) {
    }

    public record OAuthRequest(String provider, String email, String name) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }

    public record UserResponse(long id, String name, String email, Role role, Long clientId, String authProvider) {
    }
}
