package lk.maga.procapp;

import lk.maga.procapp.service.FinanceBatchNumberService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Regression test for F-18: two finance batches created at the same moment
 * must never get the same list number. The old generator read
 * COUNT(DISTINCT list_no) + 1 with no lock, so concurrent batches collided.
 *
 * Unlike SecurityCriticalTests this class is deliberately NOT @Transactional:
 * a race only exists between separate, committing transactions. It uses a
 * private counter period ('T' + 6 digits, which can never clash with a real
 * 'YYYY/MM'), so it never touches real batch numbering, and removes that
 * row afterwards.
 */
@SpringBootTest
public class FinanceBatchNumberConcurrencyTests {

    private static final int THREADS = 8;

    @Autowired private FinanceBatchNumberService financeBatchNumberService;
    @Autowired private TransactionTemplate transactionTemplate;
    @Autowired private JdbcTemplate jdbcTemplate;

    private final String period = String.format("T%06d", ThreadLocalRandom.current().nextInt(1_000_000));

    @AfterEach
    void cleanUp() {
        jdbcTemplate.update("DELETE FROM finance_batch_sequence WHERE period = ?", period);
    }

    @Test
    void concurrentBatchesNeverShareASequenceNumber() throws Exception {
        CyclicBarrier startTogether = new CyclicBarrier(THREADS);
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        try {
            List<Future<Integer>> results = new ArrayList<>();
            for (int i = 0; i < THREADS; i++) {
                results.add(pool.submit(() -> {
                    startTogether.await(10, TimeUnit.SECONDS);
                    return transactionTemplate.execute(status -> {
                        int seq = financeBatchNumberService.nextSequence(period);
                        // Hold the transaction open, as a real batch does while it
                        // updates invoices, to widen the window for a collision.
                        sleep(50);
                        return seq;
                    });
                }));
            }

            List<Integer> issued = new ArrayList<>();
            for (Future<Integer> f : results) {
                issued.add(f.get(30, TimeUnit.SECONDS));
            }

            Set<Integer> distinct = new TreeSet<>(issued);
            Set<Integer> expected = IntStream.rangeClosed(1, THREADS).boxed()
                    .collect(Collectors.toCollection(TreeSet::new));
            assertEquals(expected, distinct,
                    "Concurrent batches must each get a distinct, gap-free sequence number; got " + issued);
        } finally {
            pool.shutdownNow();
        }
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
