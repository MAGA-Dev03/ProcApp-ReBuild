package lk.maga.procapp.controller;

import jakarta.persistence.PostRemove;
import jakarta.validation.Valid;
import lk.maga.procapp.dto.GrnRequest;
import lk.maga.procapp.dto.InvoiceRequest;
import lk.maga.procapp.dto.InvoiceResponse;
import lk.maga.procapp.dto.PageResponse;
import lk.maga.procapp.entity.Invoice;
import lk.maga.procapp.security.RoleNames;
import lk.maga.procapp.service.InvoiceService;
import lk.maga.procapp.service.InvoiceStatusService;
import lk.maga.procapp.dto.BatchAddToFinanceRequest;
import lk.maga.procapp.dto.BatchAddToFinanceResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@PreAuthorize("hasAnyRole('" + RoleNames.PROCUREMENT + "', '" + RoleNames.PROCUREMENT_MANAGER + "')")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoiceStatusService statusService;

    public InvoiceController(InvoiceService invoiceService, InvoiceStatusService statusService) {
        this.invoiceService = invoiceService;
        this.statusService = statusService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('" + RoleNames.PROCUREMENT + "', '" + RoleNames.PROCUREMENT_MANAGER
            + "', '" + RoleNames.REPORT_USER + "', '" + RoleNames.SENIOR_MANAGER + "')")
    public PageResponse<InvoiceResponse> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String invoiceType,
            @RequestParam(required = false) String invoiceSource,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate receivedDateFrom,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate receivedDateTo,
            @RequestParam(required = false) Boolean financeSubmitted,
            @RequestParam(required = false) Boolean hasListNo,
            @RequestParam(required = false) BigDecimal valueMin,
            @RequestParam(required = false) BigDecimal valueMax,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateType,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate dateExact,
            @RequestParam(required = false) String reportStatus,
            @RequestParam(required = false) String listNo,
            Pageable pageable
    ) {
        // Frontend uses both names for the same concept: an invoice "submitted to finance"
        // is one that carries a listNo. Accept either param.
        Boolean submitted = financeSubmitted != null ? financeSubmitted : hasListNo;
        var page = invoiceService.list(
                projectId, supplierId, invoiceType, invoiceSource, active,
                dateFrom, dateTo, receivedDateFrom, receivedDateTo, submitted,
                valueMin, valueMax, search, dateType, dateExact, reportStatus, listNo, pageable
        );
        return PageResponse.from(page, inv -> new InvoiceResponse(inv, statusService));
    }

    @GetMapping("/list-numbers")
    @PreAuthorize("hasAnyRole('" + RoleNames.PROCUREMENT + "', '" + RoleNames.PROCUREMENT_MANAGER
            + "', '" + RoleNames.REPORT_USER + "', '" + RoleNames.SENIOR_MANAGER + "')")
    public List<String> listNumbers() {
        return invoiceService.distinctListNumbers();
    }

    @GetMapping("/{id:\\d+}")
    public InvoiceResponse getOne(@PathVariable Long id) {
        return new InvoiceResponse(invoiceService.getOrThrow(id), statusService);
    }

    @PostMapping
    public ResponseEntity<InvoiceResponse> create(
            @Valid @RequestBody InvoiceRequest req, Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        Invoice created = invoiceService.create(req, userId, authentication.getAuthorities());
        return ResponseEntity.ok(new InvoiceResponse(created, statusService));
    }

    @PutMapping("/{id}")
    public InvoiceResponse update(
            @PathVariable Long id, @Valid @RequestBody InvoiceRequest req, Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        Invoice updated = invoiceService.update(id, req, userId, authentication.getAuthorities());
        return new InvoiceResponse(updated, statusService);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        invoiceService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check-duplicate")
    public java.util.Map<String, Boolean> checkDuplicate(
            @RequestParam Long supplierId,
            @RequestParam String invoiceNumber,
            @RequestParam(required = false) Long excludeInvoiceId
    ) {
        boolean isDuplicate = invoiceService.checkDuplicate(supplierId, invoiceNumber, excludeInvoiceId);
        return java.util.Map.of("isDuplicate", isDuplicate);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('" + RoleNames.PROCUREMENT_MANAGER + "')")
    public InvoiceResponse cancel(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return new InvoiceResponse(invoiceService.cancel(id, userId), statusService);
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('" + RoleNames.PROCUREMENT_MANAGER + "')")
    public InvoiceResponse activate(@PathVariable Long id, Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        return new InvoiceResponse(invoiceService.activate(id, userId), statusService);
    }

    @PostMapping("/{id}/grn")
    public InvoiceResponse setGrn(
        @PathVariable Long id, @Valid @RequestBody GrnRequest req, Authentication authentication 
    ) {
        Long userId = (Long) authentication.getPrincipal();
        return new InvoiceResponse(invoiceService.setGrn(id, req.getGrnNumber(), userId), statusService);
    }

    @PostMapping("/{id}/attachment-viewed")
    public InvoiceResponse markAttachmentViewed(@PathVariable Long id) {
        return new InvoiceResponse(invoiceService.markAttachmentViewed(id), statusService);

    }

    @PostMapping("/{id}/clear-finance-submission")
    public InvoiceResponse clearFinanceSubmission(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return new InvoiceResponse(invoiceService.clearFinanceSubmission(id, userId), statusService);
    }
    
    @PostMapping("/batch-add-to-finance")
    public BatchAddToFinanceResponse batchAddToFinance(
        @Valid @RequestBody BatchAddToFinanceRequest req, Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        var result = invoiceService.batchAddToFinance(req.getInvoiceIds(), userId);
        return new BatchAddToFinanceResponse(result.listNo(), result.invoiceCount());
    }

    @PostMapping("/{id}/attachment")
    public InvoiceResponse uploadAttachment(
        @PathVariable Long id,
        @org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file,
        Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        Invoice updated = invoiceService.uploadAttachment(id, file, userId);
        return new InvoiceResponse(updated, statusService);

    }

    @GetMapping("/{id}/attachment")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> downloadAttachment(
        @PathVariable Long id
    ) throws java.io.IOException {
        java.nio.file.Path path = invoiceService.resolveAttachmentPath(id);
        org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());

        return org.springframework.http.ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + path.getFileName() + "\"" )
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);

    }
    
}
