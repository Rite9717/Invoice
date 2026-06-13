package com.tax.invoice.mvp;

import java.time.Instant;

public record AuditLog(
        long id,
        Instant at,
        String actor,
        String action,
        String detail
) {
}
