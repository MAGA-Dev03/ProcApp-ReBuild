package lk.maga.procapp.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Issues finance batch list numbers (YYYY/MM/DD/NNN, NNN restarting each month).
 *
 * Numbers come from a per-month counter row bumped with one atomic upsert, so
 * concurrent batches are serialised on that row and can never share a number.
 * Every issued number is also recorded in finance_batches, whose primary key
 * rejects a duplicate outright. Numbers are never reused, even after a batch's
 * invoices are cleared. See V4__finance_batch_numbering.sql.
 */
@Service
public class FinanceBatchNumberService {

    private final JdbcTemplate jdbcTemplate;

    public FinanceBatchNumberService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Must join the caller's transaction: the counter row stays locked until
     *  the batch commits, and a rolled-back batch gives its number back. */
    @Transactional(propagation = Propagation.MANDATORY)
    public String issue(LocalDate date) {
        String period = String.format("%04d/%02d", date.getYear(), date.getMonthValue());
        int seq = nextSequence(period);
        String listNo = String.format(
                "%04d/%02d/%02d/%03d",
                date.getYear(), date.getMonthValue(), date.getDayOfMonth(), seq
        );
        jdbcTemplate.update("INSERT INTO finance_batches (list_no) VALUES (?)", listNo);
        return listNo;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public int nextSequence(String period) {
        Integer value = jdbcTemplate.queryForObject(
                "INSERT INTO finance_batch_sequence (period, last_value) VALUES (?, 1) " +
                "ON CONFLICT (period) DO UPDATE " +
                "SET last_value = finance_batch_sequence.last_value + 1 " +
                "RETURNING last_value",
                Integer.class,
                period
        );
        return value;
    }
}
