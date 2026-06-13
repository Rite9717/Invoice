package com.tax.invoice.mvp.dto;

import com.tax.invoice.mvp.InvoiceItem;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class InvoiceDtos {
    public record InvoiceRequest(
            long clientId,
            long customerId,
            LocalDate issueDate,
            LocalDate dueDate,
            List<InvoiceItem> items,
            BigDecimal taxPercent,
            String gstType,
            String status
    ) {
    }

    public record PaymentRequest(
            long invoiceId,
            BigDecimal amount,
            String mode,
            String note
    ) {
    }
}
