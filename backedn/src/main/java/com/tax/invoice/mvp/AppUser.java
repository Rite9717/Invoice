package com.tax.invoice.mvp;

public record AppUser(
        long id,
        String name,
        String email,
        String password,
        Role role,
        Long clientId,
        String authProvider
) {
}
