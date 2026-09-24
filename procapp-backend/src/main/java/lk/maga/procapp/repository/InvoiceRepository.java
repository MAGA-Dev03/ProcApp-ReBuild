package lk.maga.procapp.repository;

import lk.maga.procapp.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {

    @Query("SELECT i FROM Invoice i " +
            "LEFT JOIN FETCH i.project " +
            "LEFT JOIN FETCH i.supplier " +
            "LEFT JOIN FETCH i.author " +
            "LEFT JOIN FETCH i.updatedBy " +
            "WHERE i.id = :id")
    Optional<Invoice> findByIdWithRelations(@Param("id") Long id);

    @Query("SELECT COUNT(i) > 0 FROM Invoice i WHERE i.supplier.id = :supplierId " +
        "AND LOWER(TRIM(i.invoiceNumber)) = LOWER(TRIM(CAST(:invoiceNumber AS string)))")
    boolean existsDuplicate(
        @Param("supplierId") Long supplierId,
        @Param("invoiceNumber") String invoiceNumber
    );

    @Query("SELECT COUNT(i) > 0 FROM Invoice i WHERE i.supplier.id = :supplierId " +
        "AND LOWER(TRIM(i.invoiceNumber)) = LOWER(TRIM(CAST(:invoiceNumber AS string))) " +
        "AND i.id <> :excludeInvoiceId")
    boolean existsDuplicateExcluding(
        @Param("supplierId") Long supplierId,
        @Param("invoiceNumber") String invoiceNumber,
        @Param("excludeInvoiceId") Long excludeInvoiceId
    );

    // Hard duplicate: same supplier + normalised number + same amount, among
    // active invoices only (a cancelled copy is not payable). The advisory
    // check above stays number-only; this one is enforced on save.
    // Pass excludeInvoiceId = -1 on create (ids are always positive).
    @Query("SELECT COUNT(i) > 0 FROM Invoice i WHERE i.supplier.id = :supplierId " +
        "AND LOWER(TRIM(i.invoiceNumber)) = LOWER(TRIM(CAST(:invoiceNumber AS string))) " +
        "AND i.value = :value AND i.active = true " +
        "AND i.id <> :excludeInvoiceId")
    boolean existsActiveExactDuplicate(
        @Param("supplierId") Long supplierId,
        @Param("invoiceNumber") String invoiceNumber,
        @Param("value") java.math.BigDecimal value,
        @Param("excludeInvoiceId") Long excludeInvoiceId
    );

    // Every finance batch number ever assigned, newest first — powers the
    // report screen's List No filter. A dedicated DISTINCT query so the
    // option list is complete regardless of how many invoices exist; the
    // old approach paged the first N invoices and missed the rest.
    @Query("SELECT DISTINCT i.listNo FROM Invoice i " +
            "WHERE i.listNo IS NOT NULL AND i.listNo <> '' " +
            "ORDER BY i.listNo DESC")
    List<String> findDistinctListNumbers();
}