package lk.maga.procapp.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.maga.procapp.dto.InvoiceRequest;
import lk.maga.procapp.entity.Invoice;
import lk.maga.procapp.entity.InvoiceAuditLog;
import lk.maga.procapp.entity.Project;
import lk.maga.procapp.entity.Supplier;
import lk.maga.procapp.entity.User;
import lk.maga.procapp.exception.ValidationException;
import lk.maga.procapp.repository.InvoiceAuditLogRepository;
import lk.maga.procapp.repository.InvoiceRepository;
import lk.maga.procapp.repository.InvoiceSpecifications;
import lk.maga.procapp.repository.ProjectRepository;
import lk.maga.procapp.repository.SupplierRepository;
import lk.maga.procapp.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ProjectRepository projectRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final InvoiceAuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            ProjectRepository projectRepository,
            SupplierRepository supplierRepository,
            UserRepository userRepository,
            InvoiceAuditLogRepository auditLogRepository,
            ObjectMapper objectMapper,
            FileStorageService fileStorageService
    ) {
        this.invoiceRepository = invoiceRepository;
        this.projectRepository = projectRepository;
        this.supplierRepository = supplierRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
        this.fileStorageService = fileStorageService;
    }

    public Page<Invoice> list(
            Long projectId, Long supplierId, String invoiceType, String invoiceSource,
            Boolean active, LocalDate dateFrom, LocalDate dateTo,
            LocalDate receivedDateFrom, LocalDate receivedDateTo,
            Boolean financeSubmitted,
            BigDecimal valueMin, BigDecimal valueMax, String search,
            String dateType, LocalDate dateExact, String reportStatus, String listNo,
            Pageable pageable
    ) {
        Specification<Invoice> spec = Specification.where(InvoiceSpecifications.projectId(projectId))
                .and(InvoiceSpecifications.supplierId(supplierId))
                .and(InvoiceSpecifications.invoiceType(invoiceType))
                .and(InvoiceSpecifications.invoiceSource(invoiceSource))
                .and(InvoiceSpecifications.active(active))
                .and(InvoiceSpecifications.invoiceDateFrom(dateFrom))
                .and(InvoiceSpecifications.invoiceDateTo(dateTo))
                .and(InvoiceSpecifications.receivedDateFrom(receivedDateFrom))
                .and(InvoiceSpecifications.receivedDateTo(receivedDateTo))
                .and(InvoiceSpecifications.financeSubmitted(financeSubmitted))
                .and(InvoiceSpecifications.valueMin(valueMin))
                .and(InvoiceSpecifications.valueMax(valueMax))
                .and(InvoiceSpecifications.search(search))
                .and(InvoiceSpecifications.dateExact(dateType, dateExact))
                .and(InvoiceSpecifications.reportStatus(reportStatus))
                .and(InvoiceSpecifications.listNo(listNo))
                .and(InvoiceSpecifications.withFetchedRelations());
        return invoiceRepository.findAll(spec, pageable);
    }

    /** Every finance batch number ever assigned, newest first — for the report screen's List No filter. */
    public List<String> distinctListNumbers() {
        return invoiceRepository.findDistinctListNumbers();
    }

    public Invoice getOrThrow(Long id) {
        return invoiceRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
    }

    @Transactional
    public Invoice create(InvoiceRequest req, Long authorUserId, Collection<? extends GrantedAuthority> authorities) {
        Map<String, String> fieldErrors = new HashMap<>();

        Project project = projectRepository.findById(req.getProjectId()).orElse(null);
        if (project == null) fieldErrors.put("projectId", "Project does not exist.");

        Supplier supplier = supplierRepository.findById(req.getSupplierId()).orElse(null);
        if (supplier == null) fieldErrors.put("supplierId", "Supplier does not exist.");

        if (req.getRemarks() != null && !req.getRemarks().isBlank() && !isProcurementManager(authorities)) {
            fieldErrors.put("remarks", "Only Procurement Manager can set remarks.");
        }

        if (!fieldErrors.isEmpty()) {
            throw new ValidationException(fieldErrors);
        }

        User author = userRepository.findById(authorUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid session user"));

        Invoice inv = new Invoice();
        applyFields(inv, req, project, supplier);
        inv.setAuthor(author); // from session, never from the request body
        inv.setActive(true);
        OffsetDateTime now = OffsetDateTime.now();
        inv.setCreatedAt(now);
        inv.setUpdatedAt(now);

        Invoice saved = invoiceRepository.save(inv);
        recordAudit(saved.getId(), "CREATE", authorUserId, null, snapshot(saved));
        return saved;
    }

    @Transactional
    public Invoice update(Long id, InvoiceRequest req, Long currentUserId, Collection<? extends GrantedAuthority> authorities) {
        Invoice inv = getOrThrow(id);

        if (!inv.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Invoice is cancelled and cannot be edited. Reactivate it first.");
        }
        if (inv.getListNo() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Invoice has been submitted to finance and cannot be edited. Clear the finance submission first.");
        }

        Map<String, String> fieldErrors = new HashMap<>();

        // Explicit rejection of immutable-field tampering, per the contract
        // — not silent ignoring.
        if (req.getId() != null && !req.getId().equals(id)) {
            fieldErrors.put("id", "id cannot be changed.");
        }
        if (req.getCreatedAt() != null) {
            fieldErrors.put("createdAt", "createdAt cannot be changed.");
        }
        if (req.getAuthorUserId() != null && !req.getAuthorUserId().equals(inv.getAuthor().getId())) {
            fieldErrors.put("authorUserId", "authorUserId cannot be changed.");
        }

        Project project = projectRepository.findById(req.getProjectId()).orElse(null);
        if (project == null) fieldErrors.put("projectId", "Project does not exist.");

        Supplier supplier = supplierRepository.findById(req.getSupplierId()).orElse(null);
        if (supplier == null) fieldErrors.put("supplierId", "Supplier does not exist.");

        boolean remarksChanged = !java.util.Objects.equals(req.getRemarks(), inv.getRemarks());
        if (remarksChanged && !isProcurementManager(authorities)) {
            fieldErrors.put("remarks", "Only Procurement Manager can change remarks.");
        }

        if (!fieldErrors.isEmpty()) {
            throw new ValidationException(fieldErrors);
        }

        User updatedBy = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid session user"));

        Map<String, Object> before = snapshot(inv);

        applyFields(inv, req, project, supplier);
        inv.setUpdatedBy(updatedBy);
        inv.setUpdatedAt(OffsetDateTime.now());

        Invoice saved = invoiceRepository.save(inv);
        recordAudit(id, "UPDATE", currentUserId, before, snapshot(saved));
        return saved;
    }

    @Transactional
    public void delete(Long id, Long currentUserId) {
        // Hard delete — for data-entry mistakes only. Deliberately
        // different from cancel/activate (Phase 6), which is an
        // audit-preserving soft toggle instead. Once goods have been
        // received or the invoice has been submitted to finance (carries
        // a list no.), it must be cancelled instead so the record and the
        // finance batch total survive.
        Invoice inv = getOrThrow(id);
        if (inv.getListNo() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Invoice has been submitted to finance and cannot be deleted. Cancel it instead.");
        }
        if (inv.getGrnNumber() != null && inv.getGrnReceivedDate() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Invoice has a goods-received record and cannot be deleted. Cancel it instead.");
        }
        recordAudit(id, "DELETE", currentUserId, snapshot(inv), null);
        invoiceRepository.delete(inv);
    }

    public boolean checkDuplicate(Long supplierId, String invoiceNumber, Long excludeInvoiceId) {
        if (excludeInvoiceId == null) {
            return invoiceRepository.existsDuplicate(supplierId, invoiceNumber);
    }
        return invoiceRepository.existsDuplicateExcluding(supplierId, invoiceNumber, excludeInvoiceId);
}

    private boolean isProcurementManager(Collection<? extends GrantedAuthority> authorities) {
        return authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_PROCUREMENT_MANAGER"));
    }

    /** Full field-level snapshot for CREATE/UPDATE/DELETE audit rows. */
    private Map<String, Object> snapshot(Invoice inv) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("invoiceType", inv.getInvoiceType());
        m.put("invoiceSource", inv.getInvoiceSource());
        m.put("projectId", inv.getProject() != null ? inv.getProject().getId() : null);
        m.put("supplierId", inv.getSupplier() != null ? inv.getSupplier().getId() : null);
        m.put("invoiceNumber", inv.getInvoiceNumber());
        m.put("invoiceDate", inv.getInvoiceDate());
        m.put("receivedDate", inv.getReceivedDate());
        m.put("purchaseOrderNumber", inv.getPurchaseOrderNumber());
        m.put("value", inv.getValue());
        m.put("pioNumber", inv.getPioNumber());
        m.put("grnNumber", inv.getGrnNumber());
        m.put("grnReceivedDate", inv.getGrnReceivedDate());
        m.put("listNo", inv.getListNo());
        m.put("financeSubmitDate", inv.getFinanceSubmitDate());
        m.put("remarks", inv.getRemarks());
        m.put("attachmentUrl", inv.getAttachmentUrl());
        m.put("active", inv.isActive());
        return m;
    }

    /** Writes one append-only audit row in the caller's transaction. Never updated or deleted. */
    private void recordAudit(Long invoiceId, String action, Long actorUserId,
                              Map<String, Object> before, Map<String, Object> after) {
        auditLogRepository.save(new InvoiceAuditLog(
                invoiceId, action, actorUserId, toJson(before), toJson(after)));
    }

    private String toJson(Map<String, Object> data) {
        if (data == null) return null;
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize audit data", e);
        }
    }

    private void applyFields(Invoice inv, InvoiceRequest req, Project project, Supplier supplier) {
        inv.setInvoiceType(req.getInvoiceType());
        inv.setInvoiceSource(req.getInvoiceSource());
        inv.setProject(project);
        inv.setSupplier(supplier);
        inv.setInvoiceNumber(req.getInvoiceNumber());
        inv.setInvoiceDate(req.getInvoiceDate());
        inv.setReceivedDate(req.getReceivedDate());
        inv.setPurchaseOrderNumber(req.getPurchaseOrderNumber());
        inv.setValue(req.getValue());
        inv.setPioNumber(req.getPioNumber());
        inv.setGrnNumber(req.getGrnNumber());
        inv.setGrnReceivedDate(req.getGrnReceivedDate());
        inv.setRemarks(req.getRemarks());
        inv.setAttachmentUrl(req.getAttachmentUrl());
    }

    @Transactional
    public Invoice cancel(Long id, Long currentUserId) {
        Invoice inv = getOrThrow(id);
        inv.setActive(false);
        inv.setUpdatedBy(userRepository.findById(currentUserId).orElse(null));
        inv.setUpdatedAt(OffsetDateTime.now());
        Invoice saved = invoiceRepository.save(inv);
        recordAudit(id, "CANCEL", currentUserId, Map.of("active", true), Map.of("active", false));
        return saved;
    }

    @Transactional
    public Invoice activate(Long id, Long currentUserId) {
        Invoice inv = getOrThrow(id);
        inv.setActive(true);
        inv.setUpdatedBy(userRepository.findById(currentUserId).orElse(null));
        inv.setUpdatedAt(OffsetDateTime.now());
        Invoice saved = invoiceRepository.save(inv);
        recordAudit(id, "ACTIVATE", currentUserId, Map.of("active", false), Map.of("active", true));
        return saved;
    }

    @Transactional
    public Invoice setGrn(Long id, String grnNumber, Long currentUserId) {
        Invoice inv = getOrThrow(id);
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("grnNumber", inv.getGrnNumber());
        inv.setGrnNumber(grnNumber);
        inv.setUpdatedBy(userRepository.findById(currentUserId).orElse(null));
        inv.setUpdatedAt(OffsetDateTime.now());
        Invoice saved = invoiceRepository.save(inv);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("grnNumber", grnNumber);
        recordAudit(id, "SET_GRN", currentUserId, before, after);
        return saved;
    }

    @Transactional
    public Invoice markAttachmentViewed(Long id) {
        Invoice inv = getOrThrow(id);
        inv.setAttachmentViewed(true);
        return invoiceRepository.save(inv);
    }

    @Transactional
    public Invoice clearFinanceSubmission(Long id, Long currentUserId) {
        Invoice inv = getOrThrow(id);
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("listNo", inv.getListNo());
        before.put("financeSubmitDate", inv.getFinanceSubmitDate());
        inv.setListNo(null);
        inv.setFinanceSubmitDate(null);
        inv.setUpdatedBy(userRepository.findById(currentUserId).orElse(null));
        inv.setUpdatedAt(OffsetDateTime.now());
        Invoice saved = invoiceRepository.save(inv);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("listNo", null);
        after.put("financeSubmitDate", null);
        recordAudit(id, "CLEAR_FINANCE_SUBMISSION", currentUserId, before, after);
        return saved;
    }

    public Page<Invoice> listForSiteKeeper(
            Long userId,
            Long requestedProjectId,
            Long supplierId,
            LocalDate receivedDateFrom,
            LocalDate receivedDateTo,
            String search,
            Pageable pageable) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid session user"));
        java.util.Set<Long> allowedProjectIds = user.isAllProjects()
                ? null
                : user.getProjects().stream().map(Project::getId).collect(java.util.stream.Collectors.toSet());
        Specification<Invoice> spec = Specification
                .where(InvoiceSpecifications.scopedToProjectIds(allowedProjectIds))
                .and(InvoiceSpecifications.withFetchedRelations())
                .and(InvoiceSpecifications.supplierId(supplierId))
                .and(InvoiceSpecifications.receivedDateFrom(receivedDateFrom))
                .and(InvoiceSpecifications.receivedDateTo(receivedDateTo))
                .and(InvoiceSpecifications.search(search));

        if (requestedProjectId != null) {
            spec = spec.and(InvoiceSpecifications.projectId(requestedProjectId));
        }
        return invoiceRepository.findAll(spec, pageable);
    }

    public record BatchResult(String listNo, int invoiceCount) {}

    @Transactional
    public BatchResult batchAddToFinance(List<Long> invoiceIds, Long currentUserId) {
        List<Invoice> invoices = invoiceRepository.findAllById(invoiceIds);

        // --- Validate the ENTIRE batch first. Nothing below this point
        // mutates anything. If any check fails, we throw before a single
        // save() call happens — this is the actual fix for the legacy bug
        // class, where a partial failure mid-loop left earlier invoices
        // silently submitted. ---

        if (invoices.size() != invoiceIds.size()) {
            Set<Long> foundIds = invoices.stream().map(Invoice::getId).collect(Collectors.toSet());
            List<Long> missing = invoiceIds.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new ValidationException(Map.of("invoiceIds", "Invoice id(s) not found: " + missing));
        }

        List<Long> missingGrn = invoices.stream()
                .filter(i -> i.getGrnNumber() == null || i.getGrnNumber().isBlank())
                .map(Invoice::getId)
                .toList();
        if (!missingGrn.isEmpty()) {
            throw new ValidationException(Map.of(
                    "invoiceIds",
                    "Invoice id(s) cannot be submitted to finance without a GRN: " + missingGrn
            ));
        }

        List<Long> cancelled = invoices.stream()
                .filter(i -> !i.isActive())
                .map(Invoice::getId)
                .toList();
        if (!cancelled.isEmpty()) {
            throw new ValidationException(Map.of(
                    "invoiceIds",
                    "Invoice id(s) are cancelled and cannot be submitted to finance: " + cancelled
            ));
        }

        List<Long> alreadyBatched = invoices.stream()
                .filter(i -> i.getListNo() != null && !i.getListNo().isBlank())
                .map(Invoice::getId)
                .toList();
        if (!alreadyBatched.isEmpty()) {
            throw new ValidationException(Map.of(
                    "invoiceIds",
                    "Invoice id(s) are already submitted to finance: " + alreadyBatched
            ));
        }

        // --- Validation passed for the whole batch. Now generate ONE shared
        // listNo and apply it to every invoice in the batch. ---

        LocalDate today = LocalDate.now();
        String monthPrefix = String.format("%04d/%02d/", today.getYear(), today.getMonthValue());
        long countThisMonth = invoiceRepository.countDistinctListNoWithPrefix(monthPrefix + "%");
        String listNo = String.format(
                "%04d/%02d/%02d/%03d",
                today.getYear(), today.getMonthValue(), today.getDayOfMonth(), countThisMonth + 1
        );

        User updatedBy = userRepository.findById(currentUserId).orElse(null);
        OffsetDateTime now = OffsetDateTime.now();

        for (Invoice inv : invoices) {
            inv.setListNo(listNo);
            inv.setFinanceSubmitDate(today);
            inv.setUpdatedBy(updatedBy);
            inv.setUpdatedAt(now);
        }
        invoiceRepository.saveAll(invoices);

        Map<String, Object> before = new LinkedHashMap<>();
        before.put("listNo", null);
        before.put("financeSubmitDate", null);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("listNo", listNo);
        after.put("financeSubmitDate", today);
        for (Invoice inv : invoices) {
            recordAudit(inv.getId(), "ADD_TO_FINANCE", currentUserId, before, after);
        }

        return new BatchResult(listNo, invoices.size());
    }

    private final FileStorageService fileStorageService;

    @Transactional
    public Invoice uploadAttachment(Long id, org.springframework.web.multipart.MultipartFile file, Long currentUserId) {
        Invoice inv = getOrThrow(id);
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("attachmentUrl", inv.getAttachmentUrl());
        String storedKey = fileStorageService.store(file);
        inv.setAttachmentUrl(storedKey);
        inv.setAttachmentViewed(false);
        inv.setUpdatedBy(userRepository.findById(currentUserId).orElse(null));
        inv.setUpdatedAt(OffsetDateTime.now());
        Invoice saved = invoiceRepository.save(inv);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("attachmentUrl", storedKey);
        recordAudit(id, "UPLOAD_ATTACHMENT", currentUserId, before, after);
        return saved;
    }

    public java.nio.file.Path resolveAttachmentPath(Long id) {
        Invoice inv = getOrThrow(id);
        if (inv.getAttachmentUrl() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This invoice has no attachment");

        }
        return fileStorageService.resolve(inv.getAttachmentUrl());
    }

    /** Same as {@link #getOrThrow(Long)} but 404s when the invoice is outside the
     * site keeper's assigned projects, so it can't be probed by id. */
    public Invoice getForSiteKeeperOrThrow(Long userId, Long invoiceId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid session user"));
        Invoice inv = getOrThrow(invoiceId);
        if (user.isAllProjects()) {
            return inv;
        }
        boolean inScope = user.getProjects().stream()
                .anyMatch(p -> p.getId().equals(inv.getProject().getId()));
        if (!inScope) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found");
        }
        return inv;
    }

    @Transactional
    public Invoice markAttachmentViewedForSiteKeeper(Long userId, Long invoiceId) {
        Invoice inv = getForSiteKeeperOrThrow(userId, invoiceId);
        inv.setAttachmentViewed(true);
        return invoiceRepository.save(inv);
    }

    public java.nio.file.Path resolveAttachmentPathForSiteKeeper(Long userId, Long invoiceId) {
        Invoice inv = getForSiteKeeperOrThrow(userId, invoiceId);
        if (inv.getAttachmentUrl() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This invoice has no attachment");
        }
        return fileStorageService.resolve(inv.getAttachmentUrl());
    }
}