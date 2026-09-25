package lk.maga.procapp.repository;

import lk.maga.procapp.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Query("SELECT p FROM Project p WHERE " +
        "(:search IS NULL OR LOWER(p.code) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
        "OR LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))")
    Page<Project> search(@Param("search") String search, Pageable pageable);

    @Query(value = "SELECT COUNT(*) FROM invoices WHERE project_id = :projectId", nativeQuery = true)
    long countInvoicesByProjectId(@Param("projectId") Long projectId);
}