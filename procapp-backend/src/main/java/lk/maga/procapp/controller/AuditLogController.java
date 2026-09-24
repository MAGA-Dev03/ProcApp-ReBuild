package lk.maga.procapp.controller;

import lk.maga.procapp.dto.InvoiceAuditLogResponse;
import lk.maga.procapp.dto.PageResponse;
import lk.maga.procapp.security.RoleNames;
import lk.maga.procapp.service.InvoiceAuditLogService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/audit-log")
@PreAuthorize("hasRole('" + RoleNames.SYSTEM_ADMIN + "')")
public class AuditLogController {

    private final InvoiceAuditLogService auditLogService;

    public AuditLogController(InvoiceAuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping("/invoices")
    public PageResponse<InvoiceAuditLogResponse> search(
            @RequestParam(required = false) Long invoiceId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long performedByUserId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var result = auditLogService.search(
                invoiceId, action, performedByUserId, search, dateFrom, dateTo, page, size);
        return PageResponse.from(result, r -> r);
    }
}
