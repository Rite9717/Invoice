package com.tax.invoice.mvp;

import com.tax.invoice.mvp.dto.InvoiceDtos.PaymentRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final MvpStore store;

    public PaymentController(MvpStore store) {
        this.store = store;
    }

    @GetMapping
    public List<PaymentRecord> payments(Authentication authentication) {
        AppUser user = (AppUser) authentication.getPrincipal();
        List<Invoice> visible = user.role() == Role.CA_SUPER_ADMIN ? store.invoices() : store.invoicesForClient(user.clientId());
        return store.paymentsForInvoices(visible);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CA_SUPER_ADMIN','CLIENT_ADMIN')")
    public PaymentRecord recordPayment(@RequestBody PaymentRequest request) {
        return store.recordPayment(request.invoiceId(), request.amount(), request.mode(), request.note());
    }
}
