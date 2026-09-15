package com.simcop.service;

import com.simcop.model.UserSessionRecord;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Thread-safe session tracking and revocation service.
 * Tracks active user sessions, token blacklists, and user-level revocation cutoffs.
 */
@Service
public class SessionTrackingService {

    private static final Logger logger = LoggerFactory.getLogger(SessionTrackingService.class);

    private final ConcurrentMap<String, UserSessionRecord> activeSessions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Long> userRevocationCutoff = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Long> blacklistedTokens = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private JwtUtil jwtUtil;

    public SessionTrackingService() {
    }

    public SessionTrackingService(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    /**
     * Records a newly authenticated user session.
     */
    public void recordUserSession(String username, String token, String ip, GeoLocation loc, long timestamp) {
        if (username == null) return;
        UserSessionRecord record = new UserSessionRecord(username, token, ip, loc, timestamp);
        activeSessions.put(username, record);
        logger.debug("Recorded session for user: {} from IP: {}", username, ip);
    }

    /**
     * Revokes all active sessions for a user by setting a revocation cutoff timestamp
     * and blacklisting any currently known token.
     */
    public void revokeUser(String username) {
        if (username == null) return;
        long cutoff = System.currentTimeMillis();
        userRevocationCutoff.put(username, cutoff);
        UserSessionRecord record = activeSessions.get(username);
        if (record != null && record.getToken() != null) {
            blacklistedTokens.put(record.getToken(), cutoff);
        }
        logger.warn("Revoked all sessions for user: {} at cutoff: {}", username, cutoff);
    }

    /**
     * Revokes a specific token by adding it to the token blacklist.
     */
    public void revokeToken(String token) {
        if (token == null || token.trim().isEmpty()) return;
        blacklistedTokens.put(token, System.currentTimeMillis());
        logger.warn("Token revoked and blacklisted: {}", token.length() > 10 ? token.substring(0, 10) + "..." : token);
    }

    /**
     * Verifies if a token is revoked (in token blacklist OR issued prior to user revocation cutoff).
     */
    public boolean isTokenRevoked(String token, String username) {
        if (token == null) return false;

        // 1. Check direct token blacklist
        if (blacklistedTokens.containsKey(token)) {
            return true;
        }

        // 2. Check user-level revocation cutoff
        if (username != null && userRevocationCutoff.containsKey(username)) {
            long cutoff = userRevocationCutoff.get(username);

            // If token issuedAt can be extracted via JwtUtil
            if (jwtUtil != null) {
                try {
                    Date issuedAt = jwtUtil.extractIssuedAt(token);
                    if (issuedAt != null && issuedAt.getTime() <= cutoff) {
                        return true;
                    }
                } catch (Exception e) {
                    logger.debug("Could not extract issuedAt from token: {}", e.getMessage());
                }
            }

            // Check active session record timestamp
            UserSessionRecord record = activeSessions.get(username);
            if (record != null && token.equals(record.getToken()) && record.getTimestamp() <= cutoff) {
                return true;
            }

            if (record == null) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns the last recorded session for a user.
     */
    public UserSessionRecord getLastSession(String username) {
        if (username == null) return null;
        return activeSessions.get(username);
    }

    /**
     * Updates an existing session with new IP and GeoLocation coordinates.
     */
    public void updateSession(String username, String ip, GeoLocation loc, long timestamp) {
        if (username == null) return;
        activeSessions.compute(username, (k, existing) -> {
            String token = existing != null ? existing.getToken() : null;
            return new UserSessionRecord(username, token, ip, loc, timestamp);
        });
    }

    /**
     * Clears all session tracking state (primarily for tests).
     */
    public void clear() {
        activeSessions.clear();
        userRevocationCutoff.clear();
        blacklistedTokens.clear();
    }
}
