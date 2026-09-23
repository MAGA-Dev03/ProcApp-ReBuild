package lk.maga.procapp.repository;

import lk.maga.procapp.dto.InvoiceAuditLogResponse;
import lk.maga.procapp.entity.InvoiceAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface InvoiceAuditLogRepository extends JpaRepository<InvoiceAuditLog, Long> {

    List<InvoiceAuditLog> findByInvoiceIdOrderByPerformedAtDesc(Long invoiceId);

    // invoice_id is a plain column (no FK - history must outlive the invoice row), so this is an
    // explicit ON join rather than a mapped relation. Left join means a deleted invoice's rows
    // still come back, just with a null invoiceNumber.
    //
    // Each "(:x IS NULL OR ...)" guard's own IS NULL check is the ONLY place that occurrence of
    // the parameter appears, so Postgres has nothing to infer its type from and rejects the query
    // ("could not determine data type of parameter") - the same failure mode InvoiceRepository.
    // existsDuplicate works around below. The explicit CAST gives that occurrence an unambiguous
    // type; the second occurrence (the actual comparison) already has one from its column context.
    @Query(value = "SELECT new lk.maga.procapp.dto.InvoiceAuditLogResponse(" +
            "a.id, a.invoiceId, i.invoiceNumber, a.action, a.performedByUserId, u.name, " +
            "a.performedAt, a.beforeData, a.afterData) " +
            "FROM InvoiceAuditLog a " +
            "LEFT JOIN Invoice i ON i.id = a.invoiceId " +
            "LEFT JOIN User u ON u.id = a.performedByUserId " +
            "WHERE (CAST(:invoiceId AS long) IS NULL OR a.invoiceId = :invoiceId) " +
            "AND (CAST(:action AS string) IS NULL OR a.action = :action) " +
            "AND (CAST(:performedByUserId AS long) IS NULL OR a.performedByUserId = :performedByUserId) " +
            "AND (CAST(:search AS string) IS NULL OR LOWER(i.invoiceNumber) LIKE :search) " +
            "AND (CAST(:from AS timestamp) IS NULL OR a.performedAt >= :from) " +
            "AND (CAST(:to AS timestamp) IS NULL OR a.performedAt <= :to) " +
            "ORDER BY a.performedAt DESC",
            countQuery = "SELECT COUNT(a) " +
            "FROM InvoiceAuditLog a " +
            "LEFT JOIN Invoice i ON i.id = a.invoiceId " +
            "WHERE (CAST(:invoiceId AS long) IS NULL OR a.invoiceId = :invoiceId) " +
            "AND (CAST(:action AS string) IS NULL OR a.action = :action) " +
            "AND (CAST(:performedByUserId AS long) IS NULL OR a.performedByUserId = :performedByUserId) " +
            "AND (CAST(:search AS string) IS NULL OR LOWER(i.invoiceNumber) LIKE :search) " +
            "AND (CAST(:from AS timestamp) IS NULL OR a.performedAt >= :from) " +
            "AND (CAST(:to AS timestamp) IS NULL OR a.performedAt <= :to)")
    Page<InvoiceAuditLogResponse> search(
            @Param("invoiceId") Long invoiceId,
            @Param("action") String action,
            @Param("performedByUserId") Long performedByUserId,
            @Param("search") String search,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to,
            Pageable pageable
    );
}
