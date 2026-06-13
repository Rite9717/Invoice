package com.tax.invoice.mvp;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class MvpStore {
    private final AtomicLong userId = new AtomicLong(4);
    private final AtomicLong clientId = new AtomicLong(3);
    private final AtomicLong invoiceId = new AtomicLong(3);
    private final AtomicLong paymentId = new AtomicLong(2);
    private final AtomicLong auditId = new AtomicLong(1);
    private final Map<Long, AppUser> users = new ConcurrentHashMap<>();
    private final Map<Long, ClientAccount> clients = new ConcurrentHashMap<>();
    private final Map<Long, Invoice> invoices = new ConcurrentHashMap<>();
    private final Map<Long, Product> products = new ConcurrentHashMap<>();
    private final Map<Long, CustomerAccount> customers = new ConcurrentHashMap<>();
    private final Map<Long, PaymentRecord> payments = new ConcurrentHashMap<>();
    private final Map<Long, AuditLog> audits = new ConcurrentHashMap<>();

    public MvpStore() {
        clients.put(1L, new ClientAccount(1, "Sentinal Platform", "Ritesh Kumar",
                "riteshnkumar261@gmail.com", "+91 98765 43210", "29ABCDE1234F1Z5",
                "Bengaluru, Karnataka"));
        clients.put(2L, new ClientAccount(2, "Acme Retail Pvt Ltd", "Nisha Rao",
                "billing@acmeretail.in", "+91 90000 11111", "07AAACA1234A1Z1",
                "New Delhi"));

        customers.put(1L, new CustomerAccount(1, 1, "North Star Traders", "accounts@northstar.in",
                "+91 88888 11111", "29ABCDE7654F1Z5", "Karnataka", "Mysuru, Karnataka"));
        customers.put(2L, new CustomerAccount(2, 1, "Metro Build Co", "payables@metrobuild.in",
                "+91 88888 22222", "27ABCDE7654F1Z5", "Maharashtra", "Pune, Maharashtra"));
        customers.put(3L, new CustomerAccount(3, 2, "Blue Bay Stores", "finance@bluebay.in",
                "+91 88888 33333", "07ABCDE7654F1Z5", "Delhi", "New Delhi"));

        products.put(1L, new Product(1, 1, "GST Billing Module", "SW-GST-01", 18, 5,
                BigDecimal.valueOf(25000), "998314"));
        products.put(2L, new Product(2, 1, "Support Retainer", "SRV-SUP-01", 4, 5,
                BigDecimal.valueOf(15000), "998313"));
        products.put(3L, new Product(3, 2, "Retail POS Integration", "INT-POS-01", 9, 3,
                BigDecimal.valueOf(30000), "998319"));

        users.put(1L, new AppUser(1, "CA Super Admin", "admin@invoice.local", "admin123",
                Role.CA_SUPER_ADMIN, null, "password"));
        users.put(2L, new AppUser(2, "Ritesh Kumar", "client@invoice.local", "client123",
                Role.CLIENT_ADMIN, 1L, "password"));
        users.put(3L, new AppUser(3, "North Star Buyer", "customer@invoice.local", "customer123",
                Role.CUSTOMER, 1L, "password"));

        invoices.put(1L, new Invoice(1, 1, 1, "INV-2026-001", LocalDate.now().minusDays(8),
                LocalDate.now().plusDays(7),
                List.of(new InvoiceItem("Spring Boot + React MVP sprint", 1, BigDecimal.valueOf(75000)),
                        new InvoiceItem("Deployment setup", 1, BigDecimal.valueOf(15000))),
                BigDecimal.valueOf(18), "CGST_SGST", BigDecimal.valueOf(50000), "PARTIAL", "SENT"));
        invoices.put(2L, new Invoice(2, 2, 3, "INV-2026-002", LocalDate.now().minusDays(3),
                LocalDate.now().plusDays(12),
                List.of(new InvoiceItem("Monthly support retainer", 1, BigDecimal.valueOf(25000))),
                BigDecimal.valueOf(18), "IGST", BigDecimal.ZERO, "UNPAID", "DRAFT"));

        payments.put(1L, new PaymentRecord(1, 1, BigDecimal.valueOf(50000), "UPI",
                LocalDate.now().minusDays(2), "Advance received"));

        audit("System", "Seeded master data", "Organizations, users, products, customers, invoices and payments loaded");
        audit("CA Super Admin", "Approved client organization", "Sentinal Platform");
        audit("Ritesh Kumar", "Created invoice", "INV-2026-001 with GST calculation");
        audit("System", "Low stock alert", "Support Retainer is below threshold");
    }

    public Optional<AppUser> findUserByEmail(String email) {
        return users.values().stream()
                .filter(user -> user.email().equalsIgnoreCase(email))
                .findFirst();
    }

    public AppUser saveUser(String name, String email, String password, Role role, Long linkedClientId, String provider) {
        long id = userId.getAndIncrement();
        AppUser user = new AppUser(id, name, email, password, role, linkedClientId, provider);
        users.put(id, user);
        audit(name, "Registered user", email + " as " + role);
        return user;
    }

    public List<ClientAccount> clients() {
        return clients.values().stream()
                .sorted(Comparator.comparing(ClientAccount::companyName))
                .toList();
    }

    public Optional<ClientAccount> client(long id) {
        return Optional.ofNullable(clients.get(id));
    }

    public List<Invoice> invoices() {
        return invoices.values().stream()
                .sorted(Comparator.comparing(Invoice::issueDate).reversed())
                .toList();
    }

    public List<Invoice> invoicesForClient(long accountId) {
        return invoices().stream()
                .filter(invoice -> invoice.clientId() == accountId)
                .toList();
    }

    public List<Invoice> invoicesForCustomerOrg(long accountId) {
        return invoicesForClient(accountId);
    }

    public Invoice createInvoice(long accountId, LocalDate issueDate, LocalDate dueDate,
                                 long customerAccountId, List<InvoiceItem> items, BigDecimal taxPercent,
                                 String gstType, String status) {
        long id = invoiceId.getAndIncrement();
        Invoice invoice = new Invoice(id, accountId, customerAccountId, "INV-2026-%03d".formatted(id),
                issueDate, dueDate, new ArrayList<>(items), taxPercent, gstType, BigDecimal.ZERO, "UNPAID", status);
        invoices.put(id, invoice);
        audit("Client Admin", "Created invoice", invoice.invoiceNumber() + " for customer #" + customerAccountId);
        return invoice;
    }

    public long clientCount() {
        return clients.size();
    }

    public List<Product> productsForUser(AppUser user) {
        return products.values().stream()
                .filter(product -> user.role() == Role.CA_SUPER_ADMIN || product.clientId() == user.clientId())
                .sorted(Comparator.comparing(Product::name))
                .toList();
    }

    public List<CustomerAccount> customersForUser(AppUser user) {
        return customers.values().stream()
                .filter(customer -> user.role() == Role.CA_SUPER_ADMIN || customer.clientId() == user.clientId())
                .sorted(Comparator.comparing(CustomerAccount::name))
                .toList();
    }

    public List<PaymentRecord> paymentsForInvoices(List<Invoice> visibleInvoices) {
        List<Long> ids = visibleInvoices.stream().map(Invoice::id).toList();
        return payments.values().stream()
                .filter(payment -> ids.contains(payment.invoiceId()))
                .sorted(Comparator.comparing(PaymentRecord::paidOn).reversed())
                .toList();
    }

    public PaymentRecord recordPayment(long invoiceRecordId, BigDecimal amount, String mode, String note) {
        Invoice invoice = Optional.ofNullable(invoices.get(invoiceRecordId)).orElseThrow();
        BigDecimal paid = invoice.paidAmount().add(amount);
        String paymentStatus = paid.compareTo(invoice.total()) >= 0 ? "PAID" : "PARTIAL";
        Invoice updated = new Invoice(invoice.id(), invoice.clientId(), invoice.customerId(), invoice.invoiceNumber(),
                invoice.issueDate(), invoice.dueDate(), invoice.items(), invoice.taxPercent(), invoice.gstType(),
                paid, paymentStatus, "SENT");
        invoices.put(invoice.id(), updated);

        long id = paymentId.getAndIncrement();
        PaymentRecord payment = new PaymentRecord(id, invoiceRecordId, amount, mode, LocalDate.now(), note);
        payments.put(id, payment);
        audit("Client Admin", "Recorded payment", amount + " via " + mode + " for " + invoice.invoiceNumber());
        return payment;
    }

    public List<AuditLog> auditsForUser(AppUser user) {
        return audits.values().stream()
                .sorted(Comparator.comparing(AuditLog::at).reversed())
                .limit(user.role() == Role.CUSTOMER ? 3 : 25)
                .toList();
    }

    private void audit(String actor, String action, String detail) {
        long id = auditId.getAndIncrement();
        audits.put(id, new AuditLog(id, java.time.Instant.now(), actor, action, detail));
    }
}
