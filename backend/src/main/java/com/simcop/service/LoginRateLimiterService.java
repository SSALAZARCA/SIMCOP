package com.simcop.service;

import com.simcop.model.AdminAuditLog;
import com.simcop.repository.AdminAuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
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
    public static final long DEFAULT_BLACKLIST_DURATION_MS = 24 * 3600 * 1000L; // 24 hours

    // Timestamp tracking per IP
    private final ConcurrentHashMap<String, Deque<Long>> ipFailedAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> ipLockoutExpiresAt = new ConcurrentHashMap<>();

    // Tactical Deception & RASP 24-hour IP Blacklist tracking
    private final ConcurrentHashMap<String, Long> ipBlacklistExpiresAt = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> ipBlacklistReasons = new ConcurrentHashMap<>();

    // Timestamp tracking per username
    private final ConcurrentHashMap<String, Deque<Long>> userFailedAttempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> userLockoutExpiresAt = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private AdminAuditLogRepository auditLogRepository;

    /**
     * Checks whether the client IP or username is currently blocked due to excessive failed attempts or active blacklist isolation.
     */
    public boolean isBlocked(String clientIp, String username) {
        long now = System.currentTimeMillis();

        // 0. Check Active 24-hour IP Blacklist Isolation
        if (clientIp != null && isIpBlacklisted(clientIp)) {
            return true;
        }

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
            Long blacklistExpiry = ipBlacklistExpiresAt.get(clientIp);
            if (blacklistExpiry != null && blacklistExpiry > now) {
                return Math.max(1, (blacklistExpiry - now + 999) / 1000);
            }
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

    /**
     * Isolates an offending IP address in the 24-hour security blacklist.
     * Persists the security lockout to AdminAuditLogRepository.
     */
    public void blacklistIp(String clientIp, long durationMs, String reason) {
        if (clientIp == null || clientIp.trim().isEmpty() || "UNKNOWN".equalsIgnoreCase(clientIp.trim())) {
            return;
        }
        String normIp = clientIp.trim();
        long duration = (durationMs > 0) ? durationMs : DEFAULT_BLACKLIST_DURATION_MS;
        long expiresAt = System.currentTimeMillis() + duration;
        ipBlacklistExpiresAt.put(normIp, expiresAt);
        ipBlacklistReasons.put(normIp, reason != null ? reason : "SECURITY_ISOLATION");
        ipLockoutExpiresAt.put(normIp, expiresAt);

        logger.warn("🚨 [TACTICAL_DECEPTION_RASP] IP {} aislada en lista negra por {}ms. Motivo: {}",
                normIp, duration, reason);

        if (auditLogRepository != null) {
            try {
                auditLogRepository.save(new AdminAuditLog(
                        System.currentTimeMillis(),
                        "TACTICAL_DECEPTION_RASP",
                        "IP_ISOLATED_BLACKLIST",
                        normIp,
                        String.format("IP %s blacklisted for %d ms. Reason: %s", normIp, duration, reason)
                ));
            } catch (Exception e) {
                logger.error("Error al persistir auditoría de IP en lista negra: {}", e.getMessage());
            }
        }
    }

    /**
     * Checks whether the client IP is currently isolated in the security blacklist.
     */
    public boolean isIpBlacklisted(String clientIp) {
        if (clientIp == null || clientIp.trim().isEmpty()) {
            return false;
        }
        String normIp = clientIp.trim();
        Long expiresAt = ipBlacklistExpiresAt.get(normIp);
        if (expiresAt == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        if (now < expiresAt) {
            return true;
        }
        // Lazily prune expired entry
        ipBlacklistExpiresAt.remove(normIp);
        ipBlacklistReasons.remove(normIp);
        return false;
    }

    /**
     * Removes an IP address from the security blacklist and lockout cache.
     */
    public void unblacklistIp(String clientIp) {
        if (clientIp != null && !clientIp.trim().isEmpty()) {
            String normIp = clientIp.trim();
            ipBlacklistExpiresAt.remove(normIp);
            ipBlacklistReasons.remove(normIp);
            ipLockoutExpiresAt.remove(normIp);
            logger.info("IP {} removida de la lista negra de seguridad.", normIp);
        }
    }

    /**
     * Returns an unmodifiable map of currently blacklisted IPs and their expiration timestamps.
     */
    public Map<String, Long> getBlacklistedIps() {
        long now = System.currentTimeMillis();
        Map<String, Long> activeBlacklist = new HashMap<>();
        ipBlacklistExpiresAt.forEach((ip, expiry) -> {
            if (expiry > now) {
                activeBlacklist.put(ip, expiry);
            }
        });
        return Collections.unmodifiableMap(activeBlacklist);
    }
}

