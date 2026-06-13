package com.tax.invoice.mvp;

import java.math.BigDecimal;

public record InvoiceItem(
        String description,
        int quantity,
        BigDecimal unitPrice
) {
    public BigDecimal lineTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
