package com.simcop.service;

import com.simcop.model.AdminAuditLog;
import com.simcop.repository.AdminAuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * In-memory sliding window rate limiter to protect authentication endpoints
 * against brute-force attacks and credential stuffing.
 * Tracks failed attempts by client IP and username independently.
 */
@Service
public class LoginRateLimiterService {

    private static final Logger logger = LoggerFactory.getLogger(LoginRateLimiterService.class);

    // Rate limiter thresholds & windows
    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final long ATTEMPT_WINDOW_MS = 60_000L; // 60 seconds
    public static final long LOCKOUT_DURATION_MS = 60_000L; // 60 seconds lockout
    public static final int EXTENDED_BLOCK_THRESHOLD = 10;
    public static final long EXTENDED_LOCKOUT_MS = 300_000L; // 5 minutes

    // Timestamp tracking per IP
    private final ConcurrentHashMap<String, Deque<Long>> ipFailedAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> ipLockoutExpiresAt = new ConcurrentHashMap<>();

    // Timestamp tracking per username
    private final ConcurrentHashMap<String, Deque<Long>> userFailedAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> userLockoutExpiresAt = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private AdminAuditLogRepository auditLogRepository;

    /**
     * Checks whether the client IP or username is currently blocked due to excessive failed attempts.
     */
    public boolean isBlocked(String clientIp, String username) {
        long now = System.currentTimeMillis();

        // 1. Check IP lockout expiration
        if (clientIp != null) {
            Long ipExpiry = ipLockoutExpiresAt.get(clientIp);
            if (ipExpiry != null && now < ipExpiry) {
                return true;
            }
        }

        // 2. Check Username lockout expiration
        if (username != null && !username.trim().isEmpty()) {
            String normUser = username.trim().toLowerCase();
            Long userExpiry = userLockoutExpiresAt.get(normUser);
            if (userExpiry != null && now < userExpiry) {
                return true;
            }
        }

        // 3. Evaluate sliding window for IP
        if (clientIp != null) {
            Deque<Long> ipAttempts = ipFailedAttempts.get(clientIp);
            if (ipAttempts != null) {
                pruneOldAttempts(ipAttempts, now);
                if (ipAttempts.size() >= MAX_FAILED_ATTEMPTS) {
                    long duration = (ipAttempts.size() >= EXTENDED_BLOCK_THRESHOLD) ? EXTENDED_LOCKOUT_MS : LOCKOUT_DURATION_MS;
                    ipLockoutExpiresAt.put(clientIp, now + duration);
                    return true;
                }
            }
        }

        // 4. Evaluate sliding window for Username
        if (username != null && !username.trim().isEmpty()) {
            String normUser = username.trim().toLowerCase();
            Deque<Long> userAttempts = userFailedAttempts.get(normUser);
            if (userAttempts != null) {
                pruneOldAttempts(userAttempts, now);
                if (userAttempts.size() >= MAX_FAILED_ATTEMPTS) {
                    long duration = (userAttempts.size() >= EXTENDED_BLOCK_THRESHOLD) ? EXTENDED_LOCKOUT_MS : LOCKOUT_DURATION_MS;
                    userLockoutExpiresAt.put(normUser, now + duration);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Calculates remaining lockout time in seconds for the given IP address.
     */
    public long getRemainingLockoutSeconds(String clientIp) {
        long now = System.currentTimeMillis();
        if (clientIp != null) {
            Long expiry = ipLockoutExpiresAt.get(clientIp);
            if (expiry != null && expiry > now) {
                return Math.max(1, (expiry - now + 999) / 1000);
            }
        }
        return 60; // default 60s
    }

    /**
     * Records a failed login attempt for the client IP and username.
     * Triggers lockout and audit logging if threshold is exceeded.
     */
    public void recordFailedAttempt(String clientIp, String username) {
        long now = System.currentTimeMillis();

        if (clientIp != null && !clientIp.trim().isEmpty()) {
            Deque<Long> ipAttempts = ipFailedAttempts.computeIfAbsent(clientIp, k -> new ConcurrentLinkedDeque<>());
            ipAttempts.addLast(now);
            pruneOldAttempts(ipAttempts, now);

            if (ipAttempts.size() >= MAX_FAILED_ATTEMPTS) {
                long duration = (ipAttempts.size() >= EXTENDED_BLOCK_THRESHOLD) ? EXTENDED_LOCKOUT_MS : LOCKOUT_DURATION_MS;
                long newExpiry = now + duration;
                Long prevExpiry = ipLockoutExpiresAt.put(clientIp, newExpiry);

                // Audit log on entering block state or upgrading to extended block
                if (prevExpiry == null || prevExpiry <= now || ipAttempts.size() == EXTENDED_BLOCK_THRESHOLD) {
                    logBruteForceBlocked(clientIp, username, ipAttempts.size(), duration / 1000);
                }
            }
        }

        if (username != null && !username.trim().isEmpty()) {
            String normUser = username.trim().toLowerCase();
            Deque<Long> userAttempts = userFailedAttempts.computeIfAbsent(normUser, k -> new ConcurrentLinkedDeque<>());
            userAttempts.addLast(now);
            pruneOldAttempts(userAttempts, now);

            if (userAttempts.size() >= MAX_FAILED_ATTEMPTS) {
                long duration = (userAttempts.size() >= EXTENDED_BLOCK_THRESHOLD) ? EXTENDED_LOCKOUT_MS : LOCKOUT_DURATION_MS;
                userLockoutExpiresAt.put(normUser, now + duration);
            }
        }
    }

    /**
     * Clears failed attempt counters and active lockouts for an IP and username upon successful login.
     */
    public void recordSuccessfulLogin(String clientIp, String username) {
        if (clientIp != null) {
            ipFailedAttempts.remove(clientIp);
            ipLockoutExpiresAt.remove(clientIp);
        }
        if (username != null && !username.trim().isEmpty()) {
            String normUser = username.trim().toLowerCase();
            userFailedAttempts.remove(normUser);
            userLockoutExpiresAt.remove(normUser);
        }
    }

    private void pruneOldAttempts(Deque<Long> attempts, long now) {
        long cutoff = now - ATTEMPT_WINDOW_MS;
        while (!attempts.isEmpty()) {
            Long first = attempts.peekFirst();
            if (first != null && first < cutoff) {
                attempts.pollFirst();
            } else {
                break;
            }
        }
    }

    private void logBruteForceBlocked(String clientIp, String username, int attemptCount, long durationSeconds) {
        logger.warn("🚨 [RATE_LIMIT] IP {} bloqueada por ataques de fuerza bruta ({}) intentos. Bloqueo por {}s para usuario '{}'",
                clientIp, attemptCount, durationSeconds, username != null ? username : "UNKNOWN");

        if (auditLogRepository != null) {
            try {
                auditLogRepository.save(new AdminAuditLog(
                        System.currentTimeMillis(),
                        "SECURITY_RATE_LIMITER",
                        "BRUTE_FORCE_BLOCKED",
                        "LOGIN_ATTEMPT",
                        String.format("IP %s bloqueada tras %d intentos fallidos para usuario '%s'. Lockout: %ds",
                                clientIp, attemptCount, username != null ? username : "UNKNOWN", durationSeconds)
                ));
            } catch (Exception e) {
                logger.error("Error al persistir auditoría de bloqueo por fuerza bruta: {}", e.getMessage());
            }
        }
    }
}
