package lk.maga.procapp.repository;

import lk.maga.procapp.entity.Invoice;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.JoinType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

public class InvoiceSpecifications {

    public static Specification<Invoice> scopedToProjectIds(Set<Long> allowedProjectIds) {
        return (root, query, cb) -> {
            if (allowedProjectIds == null) return null; // null = unrestricted (allProjects user)
            if (allowedProjectIds.isEmpty()) return cb.disjunction(); // no projects assigned = sees nothing
            return root.get("project").get("id").in(allowedProjectIds);
        };
    }

    public static Specification<Invoice> projectId(Long projectId) {
        return (root, query, cb) -> projectId == null ? null :
                cb.equal(root.get("project").get("id"), projectId);
    }

    public static Specification<Invoice> supplierId(Long supplierId) {
        return (root, query, cb) -> supplierId == null ? null :
                cb.equal(root.get("supplier").get("id"), supplierId);
    }

    public static Specification<Invoice> invoiceType(String type) {
        return (root, query, cb) -> (type == null || type.isBlank()) ? null :
                cb.equal(root.get("invoiceType"), type);
    }

    public static Specification<Invoice> invoiceSource(String source) {
        return (root, query, cb) -> (source == null || source.isBlank()) ? null :
                cb.equal(root.get("invoiceSource"), source);

    }

    public static Specification<Invoice> active(Boolean active) {
        return (root, query, cb) -> active == null ? null :
                cb.equal(root.get("active"), active);
    }

    public static Specification<Invoice> invoiceDateFrom(LocalDate from) {
        return (root, query, cb) -> from == null ? null :
                cb.greaterThanOrEqualTo(root.get("invoiceDate"), from);
    }

    public static Specification<Invoice> invoiceDateTo(LocalDate to) {
        return (root, query, cb) -> to == null ? null :
                cb.lessThanOrEqualTo(root.get("invoiceDate"), to);
    }

    public static Specification<Invoice> receivedDateFrom(LocalDate from) {
        return (root, query, cb) -> from == null ? null :
                cb.greaterThanOrEqualTo(root.get("receivedDate"), from);
    }

    public static Specification<Invoice> receivedDateTo(LocalDate to) {
        return (root, query, cb) -> to == null ? null :
                cb.lessThanOrEqualTo(root.get("receivedDate"), to);
    }

    /** Frontend sends financeSubmitted / hasListNo; both mean "has been batched to finance",
     * which on this schema is exactly listNo IS NOT NULL. */
    public static Specification<Invoice> financeSubmitted(Boolean submitted) {
        return (root, query, cb) -> submitted == null ? null :
                submitted ? cb.isNotNull(root.get("listNo")) : cb.isNull(root.get("listNo"));
    }

    /** Exact match on the finance batch number - the report screen's List No filter. */
    public static Specification<Invoice> listNo(String listNo) {
        return (root, query, cb) -> (listNo == null || listNo.isBlank()) ? null :
                cb.equal(root.get("listNo"), listNo);
    }

    private static final Set<String> EXACT_DATE_FIELDS =
            Set.of("invoiceDate", "receivedDate", "grnReceivedDate", "financeSubmitDate");

    /** Exact-day match against the date field named by dateType - the report screen's
     * Date Type picker plus the "On date" input. Unknown field names are ignored. */
    public static Specification<Invoice> dateExact(String dateType, LocalDate date) {
        return (root, query, cb) -> (date == null || dateType == null || !EXACT_DATE_FIELDS.contains(dateType))
                ? null : cb.equal(root.get(dateType), date);
    }

    /** The report screen's Report Status filter. Mirrors InvoiceStatusService.compute but
     * expressed as a query predicate, and (like the report) ignores the cancelled state. */
    public static Specification<Invoice> reportStatus(String status) {
        return (root, query, cb) -> {
            if (status == null || status.isBlank()) return null;
            var grnNumber = root.<String>get("grnNumber");
            var hasGrn = cb.and(cb.isNotNull(grnNumber), cb.notEqual(grnNumber, ""));
            return switch (status) {
                case "NOT_SUBMITTED" -> cb.or(cb.isNull(grnNumber), cb.equal(grnNumber, ""));
                case "GRN_PENDING" -> cb.and(hasGrn, cb.isNull(root.get("grnReceivedDate")));
                case "GRN_RECEIVED" -> cb.and(
                        hasGrn,
                        cb.isNotNull(root.get("grnReceivedDate")),
                        cb.isNull(root.get("listNo")));
                case "SUBMITTED" -> cb.isNotNull(root.get("listNo"));
                default -> null;
            };
        };
    }

    public static Specification<Invoice> valueMin(BigDecimal min) {
        return (root, query, cb) -> min == null ? null :
                cb.greaterThanOrEqualTo(root.get("value"), min);
    }

    public static Specification<Invoice> valueMax(BigDecimal max) {
        return (root, query, cb) -> max == null ? null :
                cb.lessThanOrEqualTo(root.get("value"), max);
    }

    public static Specification<Invoice> search(String term) {
        return (root, query, cb) -> {
            if (term == null || term.isBlank()) return null;
            String pattern = "%" + term.toLowerCase() + "%";
            var project = root.join("project", JoinType.LEFT);
            var supplier = root.join("supplier", JoinType.LEFT);
            return cb.or(
                cb.like(cb.lower(root.get("invoiceNumber")), pattern),
                cb.like(cb.lower(root.get("purchaseOrderNumber")), pattern),
                cb.like(cb.lower(root.get("pioNumber")), pattern),
                cb.like(cb.lower(project.get("name")), pattern),
                cb.like(cb.lower(project.get("code")), pattern),
                cb.like(cb.lower(supplier.get("name")), pattern)
            );
        };
    }

    public static  Specification<Invoice> outstandingOnly(boolean outstandingOnly) {
        return (root, query, cb) -> !outstandingOnly ? null :
                cb.and(cb.isTrue(root.get("active")), cb.isNull(root.get("listNo")));
    }

    public static Specification<Invoice> withFetchedRelations() {
        return (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("project", JoinType.LEFT);
                root.fetch("supplier", JoinType.LEFT);
                root.fetch("author", JoinType.LEFT);
                root.fetch("updatedBy", JoinType.LEFT);
                query.distinct(true);
            }
            return cb.conjunction();
        };
    }
    
}
