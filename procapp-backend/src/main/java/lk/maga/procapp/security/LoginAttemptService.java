package lk.maga.procapp.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory failed-login tracker. Locks an email out for LOCKOUT_DURATION
 * after MAX_ATTEMPTS consecutive failures, so brute-forcing a password
 * against one account is no longer unlimited.
 *
 * Keyed by email (case-insensitive) rather than IP, since the threat this
 * closes is unlimited guessing against a known account.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_SECONDS = 10 * 60;

    private static class Attempt {
        final AtomicInteger failures = new AtomicInteger(0);
        volatile Instant lockedUntil;
    }

    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    private String key(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    public boolean isLocked(String email) {
        Attempt a = attempts.get(key(email));
        if (a == null || a.lockedUntil == null) {
            return false;
        }
        if (Instant.now().isAfter(a.lockedUntil)) {
            attempts.remove(key(email));
            return false;
        }
        return true;
    }

    public void recordFailure(String email) {
        Attempt a = attempts.computeIfAbsent(key(email), k -> new Attempt());
        int failures = a.failures.incrementAndGet();
        if (failures >= MAX_ATTEMPTS) {
            a.lockedUntil = Instant.now().plusSeconds(LOCKOUT_DURATION_SECONDS);
        }
    }

    public void recordSuccess(String email) {
        attempts.remove(key(email));
    }
}
