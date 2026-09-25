package lk.maga.procapp.service;

import lk.maga.procapp.dto.dashboard.*;
import lk.maga.procapp.repository.DashboardRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DashboardService {

    /** Same labels and order as the frontend's AGING_BUCKET_KEYS - every bucket renders even at zero. */
    private static final List<String> AGING_BUCKET_ORDER =
            List.of("<30", "31-45", "46-60", "61-75", "76-90", "91-120", "120+");

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final DashboardRepository repo;

    public DashboardService(DashboardRepository repo) {
        this.repo = repo;
    }

    public DashboardSummaryResponse summary() {
        return new DashboardSummaryResponse(
                repo.outstandingValue(),
                repo.grnPendingCount(),
                repo.readyToSubmitCount(),
                repo.submittedThisMonthValue()
        );
    }

    public List<AgingBucketRow> agingBuckets() {
        Map<String, AgingBucketRow> byBucket = new HashMap<>();
        for (Object[] row : repo.agingBuckets()) {
            String bucket = (String) row[0];
            BigDecimal total = toBigDecimal(row[1]);
            long count = ((Number) row[2]).longValue();
            byBucket.put(bucket, new AgingBucketRow(bucket, total, count));
        }
        List<AgingBucketRow> result = new ArrayList<>();
        for (String bucket : AGING_BUCKET_ORDER) {
            result.add(byBucket.getOrDefault(bucket, new AgingBucketRow(bucket, BigDecimal.ZERO, 0)));
        }
        return result;
    }

    public AgingBucketBreakdownResponse agingBucketBreakdown(String bucket) {
        if (!AGING_BUCKET_ORDER.contains(bucket)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown aging bucket: " + bucket);
        }
        return new AgingBucketBreakdownResponse(
                bucket,
                mapBreakdown(repo.agingBreakdownBySupplierForBucket(bucket)),
                mapBreakdown(repo.agingBreakdownByProjectForBucket(bucket))
        );
    }

    private List<AgingBreakdownRow> mapBreakdown(List<Object[]> rows) {
        List<AgingBreakdownRow> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new AgingBreakdownRow(
                    ((Number) row[0]).longValue(),
                    (String) row[1],
                    toBigDecimal(row[2]),
                    ((Number) row[3]).longValue()
            ));
        }
        return result;
    }

    public List<TopSupplierRow> topSuppliers(int limit) {
        List<TopSupplierRow> result = new ArrayList<>();
        for (Object[] row : repo.topSuppliersByOutstandingValue(limit)) {
            result.add(new TopSupplierRow(
                    ((Number) row[0]).longValue(),
                    (String) row[1],
                    toBigDecimal(row[2])
            ));
        }
        return result;
    }

    public List<TrendPoint> receivedVsSubmittedTrend() {
        Map<String, BigDecimal[]> byMonth = new HashMap<>();
        for (Object[] row : repo.receivedValueByMonth(12)) {
            byMonth.computeIfAbsent((String) row[0], m -> zeroPair())[0] = toBigDecimal(row[1]);
        }
        for (Object[] row : repo.submittedValueByMonth(12)) {
            byMonth.computeIfAbsent((String) row[0], m -> zeroPair())[1] = toBigDecimal(row[1]);
        }

        List<TrendPoint> result = new ArrayList<>();
        YearMonth cursor = YearMonth.now().minusMonths(11);
        for (int i = 0; i < 12; i++) {
            String key = cursor.format(MONTH_FMT);
            BigDecimal[] vals = byMonth.getOrDefault(key, zeroPair());
            result.add(new TrendPoint(key, vals[0], vals[1]));
            cursor = cursor.plusMonths(1);
        }
        return result;
    }

    public List<MonthlyVolumePoint> monthlyVolume() {
        Map<String, Long> byMonth = new HashMap<>();
        for (Object[] row : repo.volumeByMonth(12)) {
            byMonth.put((String) row[0], ((Number) row[1]).longValue());
        }
        List<MonthlyVolumePoint> result = new ArrayList<>();
        YearMonth cursor = YearMonth.now().minusMonths(11);
        for (int i = 0; i < 12; i++) {
            String key = cursor.format(MONTH_FMT);
            result.add(new MonthlyVolumePoint(key, byMonth.getOrDefault(key, 0L)));
            cursor = cursor.plusMonths(1);
        }
        return result;
    }

    public CycleTimeResponse cycleTime() {
        LocalDate now = LocalDate.now();
        LocalDate prevMonth = now.minusMonths(1);

        Double current = repo.averageCycleDaysForMonth(now.getYear(), now.getMonthValue());
        Double previous = repo.averageCycleDaysForMonth(prevMonth.getYear(), prevMonth.getMonthValue());
        double allTime = repo.averageCycleDaysAllTime();
        return new CycleTimeResponse(current, previous, allTime);
    }

    public List<FinanceBatchSummary> recentFinanceBatches() {
        List<FinanceBatchSummary> result = new ArrayList<>();
        for (Object[] row : repo.recentFinanceBatches(10)) {
            result.add(new FinanceBatchSummary(
                    (String) row[0],
                    ((java.sql.Date) row[1]).toLocalDate(),
                    ((Number) row[2]).longValue(),
                    toBigDecimal(row[3])
            ));
        }
        return result;
    }

    private static BigDecimal[] zeroPair() {
        return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        return new BigDecimal(value.toString());
    }
}
