package com.tax.invoice.mvp;

public record CustomerAccount(
        long id,
        long clientId,
        String name,
        String email,
        String phone,
        String gstNumber,
        String state,
        String address
) {
}
