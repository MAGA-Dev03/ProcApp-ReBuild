package lk.maga.procapp.controller;

import lk.maga.procapp.dto.InvoiceResponse;
import lk.maga.procapp.dto.PageResponse;
import lk.maga.procapp.security.RoleNames;
import lk.maga.procapp.service.InvoiceService;
import lk.maga.procapp.service.InvoiceStatusService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/site-keeper")
@PreAuthorize("hasAnyRole('" + RoleNames.SITE_STORE_KEEPER + "')")

public class SiteKeeperController {

    private final InvoiceService invoiceService;
    private final InvoiceStatusService statusService;

    public SiteKeeperController(InvoiceService invoiceService, InvoiceStatusService statusService) {
        this.invoiceService = invoiceService;
        this.statusService = statusService;
    }

    @GetMapping("/invoices")
    public PageResponse<InvoiceResponse> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate receivedDateFrom,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate receivedDateTo,
            @RequestParam(required = false) String search,
            Authentication authentication,
            Pageable pageable
    ) {
        Long userId = (Long) authentication.getPrincipal();
        var page = invoiceService.listForSiteKeeper(
                userId, projectId, supplierId, receivedDateFrom, receivedDateTo, search, pageable);
        return PageResponse.from(page, inv -> new InvoiceResponse(inv, statusService));
    }

    @PostMapping("/invoices/{id}/attachment-viewed")
    public InvoiceResponse markAttachmentViewed(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return new InvoiceResponse(
                invoiceService.markAttachmentViewedForSiteKeeper(userId, id), statusService);
    }

    @GetMapping("/invoices/{id}/attachment")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> downloadAttachment(
            @PathVariable Long id, Authentication authentication
    ) throws java.io.IOException {
        Long userId = (Long) authentication.getPrincipal();
        java.nio.file.Path path = invoiceService.resolveAttachmentPathForSiteKeeper(userId, id);
        org.springframework.core.io.Resource resource =
                new org.springframework.core.io.UrlResource(path.toUri());

        return org.springframework.http.ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + path.getFileName() + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }
}
