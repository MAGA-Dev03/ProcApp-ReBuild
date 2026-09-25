package lk.maga.procapp.repository;

import lk.maga.procapp.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    boolean existsByBusinessPartnerCodeIgnoreCase(String code);

    boolean existsByBusinessPartnerCodeIgnoreCaseAndIdNot(String code, Long id);

    // Email is nullable, so uniqueness only applies when a value is actually
    // provided — mirrors the partial unique index in V1__init_schema.sql.
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    @Query("SELECT s FROM Supplier s WHERE " +
            "(:search IS NULL OR LOWER(s.businessPartnerCode) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
            "OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))")
    Page<Supplier> search(@Param("search") String search, Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM invoices WHERE supplier_id = :supplierId", nativeQuery = true)
    long countInvoicesBySupplierId(@Param("supplierId") Long supplierId);
}