package com.tax.invoice.mvp;

import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final MvpStore store;

    public ReportController(MvpStore store) {
        this.store = store;
    }

    @GetMapping("/overview")
    public Map<String, Object> overview(Authentication authentication) {
        AppUser user = (AppUser) authentication.getPrincipal();
        List<Invoice> visible = user.role() == Role.CA_SUPER_ADMIN ? store.invoices() : store.invoicesForClient(user.clientId());
        return Map.of(
                "gstr1ReadyInvoices", visible.stream().filter(invoice -> !"DRAFT".equals(invoice.status())).count(),
                "paidInvoices", visible.stream().filter(invoice -> "PAID".equals(invoice.paymentStatus())).count(),
                "partialInvoices", visible.stream().filter(invoice -> "PARTIAL".equals(invoice.paymentStatus())).count(),
                "unpaidInvoices", visible.stream().filter(invoice -> "UNPAID".equals(invoice.paymentStatus())).count());
    }

    @GetMapping(value = "/gstr1.csv", produces = "text/csv")
    public String gstr1(Authentication authentication) {
        AppUser user = (AppUser) authentication.getPrincipal();
        List<Invoice> visible = user.role() == Role.CA_SUPER_ADMIN ? store.invoices() : store.invoicesForClient(user.clientId());
        StringBuilder csv = new StringBuilder("invoiceNumber,date,gstType,taxableValue,cgst,sgst,igst,total,status\n");
        visible.forEach(invoice -> csv.append("%s,%s,%s,%s,%s,%s,%s,%s,%s\n".formatted(
                invoice.invoiceNumber(), invoice.issueDate(), invoice.gstType(), invoice.subtotal(),
                invoice.cgstAmount(), invoice.sgstAmount(), invoice.igstAmount(), invoice.total(), invoice.status())));
        return csv.toString();
    }

    @GetMapping(value = "/audit", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<AuditLog> audit(Authentication authentication) {
        return store.auditsForUser((AppUser) authentication.getPrincipal());
    }
}
