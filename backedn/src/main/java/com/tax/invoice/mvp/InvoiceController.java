package com.tax.invoice.mvp;

import com.tax.invoice.mvp.dto.InvoiceDtos.InvoiceRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final MvpStore store;

    public InvoiceController(MvpStore store) {
        this.store = store;
    }

    @GetMapping
    public List<Invoice> invoices(Authentication authentication) {
        AppUser user = (AppUser) authentication.getPrincipal();
        if (user.role() == Role.CA_SUPER_ADMIN) {
            return store.invoices();
        }
        return store.invoicesForClient(user.clientId());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CA_SUPER_ADMIN','CLIENT_ADMIN','CUSTOMER')")
    public Invoice createInvoice(@RequestBody InvoiceRequest request, Authentication authentication) {
        AppUser user = (AppUser) authentication.getPrincipal();
        long clientId = user.role() == Role.CA_SUPER_ADMIN ? request.clientId() : user.clientId();
        long customerId = request.customerId() == 0 ? store.firstCustomerIdForClient(clientId) : request.customerId();
        String status = request.status() == null ? (user.role() == Role.CUSTOMER ? "GENERATED" : "DRAFT") : request.status();
        return store.createInvoice(
                clientId,
                request.issueDate() == null ? LocalDate.now() : request.issueDate(),
                request.dueDate() == null ? LocalDate.now().plusDays(15) : request.dueDate(),
                customerId,
                request.items(),
                request.taxPercent() == null ? BigDecimal.valueOf(18) : request.taxPercent(),
                request.gstType() == null ? "CGST_SGST" : request.gstType(),
                status);
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(Authentication authentication) {
        AppUser user = (AppUser) authentication.getPrincipal();
        List<Invoice> visible = user.role() == Role.CA_SUPER_ADMIN ? store.invoices() : store.invoicesForClient(user.clientId());
        BigDecimal total = visible.stream().map(Invoice::total).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = visible.stream().map(Invoice::paidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long lowStock = store.productsForUser(user).stream().filter(Product::lowStock).count();
        return Map.of(
                "invoiceCount", visible.size(),
                "clientCount", user.role() == Role.CA_SUPER_ADMIN ? store.clientCount() : 1,
                "paidAmount", paid,
                "pendingAmount", total.subtract(paid),
                "lowStockCount", lowStock,
                "totalAmount", total,
                "role", user.role());
    }
}
