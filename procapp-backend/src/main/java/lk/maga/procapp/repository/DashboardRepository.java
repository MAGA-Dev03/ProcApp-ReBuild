package lk.maga.procapp.repository;

import org.springframework.stereotype.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.util.List;

@Repository
public class DashboardRepository {

    /**
     * Aging is measured from invoice_date, and a bucket owns every invoice whose age in days is
     * <= its upper bound (so a future-dated invoice with a negative age lands in "<30"). This CASE
     * expression is the single source of truth for the boundaries and is reused verbatim by the
     * breakdown queries so a drill-down can never disagree with the summary chart.
     */
    private static final String AGING_BUCKET_CASE =
            "CASE " +
            "  WHEN (CURRENT_DATE - %1$s.invoice_date) <= 29 THEN '<30' " +
            "  WHEN (CURRENT_DATE - %1$s.invoice_date) <= 45 THEN '31-45' " +
            "  WHEN (CURRENT_DATE - %1$s.invoice_date) <= 60 THEN '46-60' " +
            "  WHEN (CURRENT_DATE - %1$s.invoice_date) <= 75 THEN '61-75' " +
            "  WHEN (CURRENT_DATE - %1$s.invoice_date) <= 90 THEN '76-90' " +
            "  WHEN (CURRENT_DATE - %1$s.invoice_date) <= 120 THEN '91-120' " +
            "  ELSE '120+' " +
            "END";

    private final EntityManager em;

    public DashboardRepository(EntityManager em) {
        this.em = em;
    }

    // --- Aging buckets (value + count, outstanding scope) ---

    @SuppressWarnings("unchecked")
    public List<Object[]> agingBuckets() {
        String bucket = String.format(AGING_BUCKET_CASE, "invoices");
        Query q = em.createNativeQuery(
                "SELECT " + bucket + " AS bucket, " +
                "  COALESCE(SUM(value), 0) AS total_value, " +
                "  COUNT(*) AS invoice_count " +
                "FROM invoices " +
                "WHERE active = true AND list_no IS NULL " +
                "GROUP BY bucket"
        );
        return q.getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> agingBreakdownBySupplierForBucket(String bucket) {
        String bucketExpr = String.format(AGING_BUCKET_CASE, "i");
        Query q = em.createNativeQuery(
                "SELECT s.id, s.name, COALESCE(SUM(i.value), 0), COUNT(*) " +
                "FROM invoices i JOIN suppliers s ON i.supplier_id = s.id " +
                "WHERE i.active = true AND i.list_no IS NULL AND " + bucketExpr + " = :bucket " +
                "GROUP BY s.id, s.name ORDER BY 3 DESC"
        );
        q.setParameter("bucket", bucket);
        return q.getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> agingBreakdownByProjectForBucket(String bucket) {
        String bucketExpr = String.format(AGING_BUCKET_CASE, "i");
        Query q = em.createNativeQuery(
                "SELECT p.id, p.name, COALESCE(SUM(i.value), 0), COUNT(*) " +
                "FROM invoices i JOIN projects p ON i.project_id = p.id " +
                "WHERE i.active = true AND i.list_no IS NULL AND " + bucketExpr + " = :bucket " +
                "GROUP BY p.id, p.name ORDER BY 3 DESC"
        );
        q.setParameter("bucket", bucket);
        return q.getResultList();
    }

    // --- Top suppliers by outstanding payable ---

    @SuppressWarnings("unchecked")
    public List<Object[]> topSuppliersByOutstandingValue(int limit) {
        Query q = em.createNativeQuery(
                "SELECT s.id, s.name, COALESCE(SUM(i.value), 0) " +
                "FROM invoices i JOIN suppliers s ON i.supplier_id = s.id " +
                "WHERE i.active = true AND i.list_no IS NULL " +
                "GROUP BY s.id, s.name ORDER BY 3 DESC LIMIT :limit"
        );
        q.setParameter("limit", limit);
        return q.getResultList();
    }

    // --- Received vs submitted VALUE by month (matches the aging chart's value basis) ---

    @SuppressWarnings("unchecked")
    public List<Object[]> receivedValueByMonth(int monthsBack) {
        Query q = em.createNativeQuery(
                "SELECT TO_CHAR(received_date, 'YYYY-MM') AS month, COALESCE(SUM(value), 0) " +
                "FROM invoices " +
                "WHERE received_date >= (CURRENT_DATE - (INTERVAL '1 month' * :monthsBack)) " +
                "GROUP BY month"
        );
        q.setParameter("monthsBack", monthsBack);
        return q.getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> submittedValueByMonth(int monthsBack) {
        Query q = em.createNativeQuery(
                "SELECT TO_CHAR(finance_submit_date, 'YYYY-MM') AS month, COALESCE(SUM(value), 0) " +
                "FROM invoices " +
                "WHERE finance_submit_date IS NOT NULL " +
                "AND finance_submit_date >= (CURRENT_DATE - (INTERVAL '1 month' * :monthsBack)) " +
                "GROUP BY month"
        );
        q.setParameter("monthsBack", monthsBack);
        return q.getResultList();
    }

    // --- Monthly invoice volume (count, by received month) ---

    @SuppressWarnings("unchecked")
    public List<Object[]> volumeByMonth(int monthsBack) {
        Query q = em.createNativeQuery(
                "SELECT TO_CHAR(received_date, 'YYYY-MM') AS month, COUNT(*) " +
                "FROM invoices " +
                "WHERE received_date >= (CURRENT_DATE - (INTERVAL '1 month' * :monthsBack)) " +
                "GROUP BY month"
        );
        q.setParameter("monthsBack", monthsBack);
        return q.getResultList();
    }

    // --- Cycle time (received_date -> finance_submit_date, in days) ---

    public Double averageCycleDaysForMonth(int year, int month) {
        Query q = em.createNativeQuery(
                "SELECT AVG(finance_submit_date - received_date) " +
                "FROM invoices " +
                "WHERE finance_submit_date IS NOT NULL " +
                "AND EXTRACT(YEAR FROM finance_submit_date) = :year " +
                "AND EXTRACT(MONTH FROM finance_submit_date) = :month"
        );
        q.setParameter("year", year);
        q.setParameter("month", month);
        Object result = q.getSingleResult();
        return result == null ? null : ((Number) result).doubleValue();
    }

    public double averageCycleDaysAllTime() {
        Query q = em.createNativeQuery(
                "SELECT AVG(finance_submit_date - received_date) " +
                "FROM invoices WHERE finance_submit_date IS NOT NULL"
        );
        Object result = q.getSingleResult();
        return result == null ? 0.0 : ((Number) result).doubleValue();
    }

    // --- Recent finance batches ---

    @SuppressWarnings("unchecked")
    public List<Object[]> recentFinanceBatches(int limit) {
        Query q = em.createNativeQuery(
                "SELECT list_no, finance_submit_date, COUNT(*), COALESCE(SUM(value), 0) " +
                "FROM invoices " +
                "WHERE list_no IS NOT NULL " +
                "GROUP BY list_no, finance_submit_date " +
                "ORDER BY finance_submit_date DESC " +
                "LIMIT :limit"
        );
        q.setParameter("limit", limit);
        return q.getResultList();
    }

    // --- Summary tiles ---

    public BigDecimal outstandingValue() {
        Query q = em.createNativeQuery(
                "SELECT COALESCE(SUM(value), 0) FROM invoices WHERE active = true AND list_no IS NULL"
        );
        return (BigDecimal) q.getSingleResult();
    }

    public long grnPendingCount() {
        Query q = em.createNativeQuery(
                "SELECT COUNT(*) FROM invoices " +
                "WHERE active = true AND (grn_number IS NULL OR grn_received_date IS NULL)"
        );
        return ((Number) q.getSingleResult()).longValue();
    }

    public long readyToSubmitCount() {
        Query q = em.createNativeQuery(
                "SELECT COUNT(*) FROM invoices " +
                "WHERE active = true AND grn_number IS NOT NULL AND grn_received_date IS NOT NULL " +
                "AND list_no IS NULL"
        );
        return ((Number) q.getSingleResult()).longValue();
    }

    public BigDecimal submittedThisMonthValue() {
        Query q = em.createNativeQuery(
                "SELECT COALESCE(SUM(value), 0) FROM invoices " +
                "WHERE finance_submit_date IS NOT NULL " +
                "AND EXTRACT(YEAR FROM finance_submit_date) = EXTRACT(YEAR FROM CURRENT_DATE) " +
                "AND EXTRACT(MONTH FROM finance_submit_date) = EXTRACT(MONTH FROM CURRENT_DATE)"
        );
        return (BigDecimal) q.getSingleResult();
    }
}
