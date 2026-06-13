package com.tax.invoice.mvp;

public record ClientAccount(
        long id,
        String companyName,
        String contactName,
        String email,
        String phone,
        String gstNumber,
        String address
) {
}
