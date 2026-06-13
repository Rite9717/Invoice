package com.tax.invoice.mvp;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentRecord(
        long id,
        long invoiceId,
        BigDecimal amount,
        String mode,
        LocalDate paidOn,
        String note
) {
}
