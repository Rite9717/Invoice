package com.tax.invoice.mvp;

import java.math.BigDecimal;

public record Product(
        long id,
        long clientId,
        String name,
        String sku,
        int stock,
        int lowStockAt,
        BigDecimal price,
        String hsnCode
) {
    public boolean lowStock() {
        return stock <= lowStockAt;
    }
}
