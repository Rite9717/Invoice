package com.tax.invoice.mvp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record Invoice(
        long id,
        long clientId,
        long customerId,
        String invoiceNumber,
        LocalDate issueDate,
        LocalDate dueDate,
        List<InvoiceItem> items,
        BigDecimal taxPercent,
        String gstType,
        BigDecimal paidAmount,
        String paymentStatus,
        String status
) {
    public BigDecimal subtotal() {
        return items.stream()
                .map(InvoiceItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal taxAmount() {
        return subtotal().multiply(taxPercent).divide(BigDecimal.valueOf(100));
    }

    public BigDecimal cgstAmount() {
        if (!"CGST_SGST".equals(gstType)) {
            return BigDecimal.ZERO;
        }
        return taxAmount().divide(BigDecimal.valueOf(2));
    }

    public BigDecimal sgstAmount() {
        return cgstAmount();
    }

    public BigDecimal igstAmount() {
        if (!"IGST".equals(gstType)) {
            return BigDecimal.ZERO;
        }
        return taxAmount();
    }

    public BigDecimal total() {
        return subtotal().add(taxAmount());
    }

    public BigDecimal balanceDue() {
        return total().subtract(paidAmount == null ? BigDecimal.ZERO : paidAmount);
    }
}
