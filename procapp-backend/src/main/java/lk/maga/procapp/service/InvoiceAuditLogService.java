package lk.maga.procapp.service;

import lk.maga.procapp.dto.InvoiceAuditLogResponse;
import lk.maga.procapp.repository.InvoiceAuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class InvoiceAuditLogService {

    private final InvoiceAuditLogRepository auditLogRepository;

    public InvoiceAuditLogService(InvoiceAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public Page<InvoiceAuditLogResponse> search(
            Long invoiceId, String action, Long performedByUserId, String search,
            LocalDate dateFrom, LocalDate dateTo, int page, int size
    ) {
        String likePattern = (search == null || search.isBlank())
                ? null
                : "%" + search.trim().toLowerCase() + "%";
        OffsetDateTime from = dateFrom == null ? null : dateFrom.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime to = dateTo == null ? null : dateTo.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        // Sort is fixed to newest-first in the query itself - a plain PageRequest here (no Sort)
        // keeps Spring Data from trying to append a second, conflicting ORDER BY.
        return auditLogRepository.search(
                invoiceId, action, performedByUserId, likePattern, from, to,
                PageRequest.of(page, size)
        );
    }
}
