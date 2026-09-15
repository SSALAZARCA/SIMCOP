package com.simcop.security;

import com.simcop.service.ActiveCyberDefenseService;
import com.simcop.util.ClientIpResolver;
import com.simcop.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ConcurrentMap;

/**
 * Data Loss Prevention (DLP) Anti-Scraping Throttling Filter.
 * Protects sensitive military tactical endpoints against automated scraping and exfiltration bursts.
 * Enforces a 10-second sliding window with progressive tarpit delays (16-25 reqs)
 * and HTTP 429 lockout (> 25 reqs) with ACD intrusion alerts.
 */
@Component
public class DlpThrottlingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(DlpThrottlingFilter.class);

    private static final long WINDOW_MILLIS = 10000L; // 10 seconds

    private static final String[] SENSITIVE_PREFIXES = {
            "/api/soldiers",
            "/api/units",
            "/api/graphics",
            "/api/observers",
            "/api/artillery",
            "/api/uav",
            "/api/ordop",
            "/api/coa-plans",
            "/api/intel"
    };

    private final ConcurrentMap<String, Queue<Long>> requestHistory = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private ActiveCyberDefenseService activeCyberDefenseService;

    @Autowired(required = false)
    private JwtUtil jwtUtil;

    public DlpThrottlingFilter() {
    }

    public DlpThrottlingFilter(ActiveCyberDefenseService activeCyberDefenseService, JwtUtil jwtUtil) {
        this.activeCyberDefenseService = activeCyberDefenseService;
        this.jwtUtil = jwtUtil;
    }

    public static boolean isSensitiveEndpoint(String uri) {
        if (uri == null) return false;
        for (String prefix : SENSITIVE_PREFIXES) {
            if (uri.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        // Check if request targets sensitive DLP-protected endpoints
        if (!isSensitiveEndpoint(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = ClientIpResolver.getClientIp(request);
        String username = extractUsernameFromToken(request);
        String trackingKey = (username != null && !username.isEmpty()) ? clientIp + "_" + username : clientIp;

        long now = System.currentTimeMillis();
        Queue<Long> timestamps = requestHistory.computeIfAbsent(trackingKey, k -> new ConcurrentLinkedQueue<>());

        // Evict expired entries older than 10s sliding window
        while (!timestamps.isEmpty() && (now - timestamps.peek() > WINDOW_MILLIS)) {
            timestamps.poll();
        }

        timestamps.add(now);
        int requestCount = timestamps.size();

        logger.debug("DLP Request count for {}: {} on {}", trackingKey, requestCount, uri);

        // Tier 1: Normal activity (<= 15 requests / 10s)
        if (requestCount <= 15) {
            filterChain.doFilter(request, response);
            return;
        }

        // Tier 2: Suspicious scraping burst (16 - 25 requests / 10s) -> Progressive tarpit delay
        if (requestCount <= 25) {
            int delayMs = Math.min(3000, 400 * (requestCount - 15));
            logger.warn("⚠️ [DLP_TARPIT] Injecting {}ms artificial delay for IP: {} (count={}) on sensitive URI: {}",
                    delayMs, clientIp, requestCount, uri);
            try {
                Thread.sleep(delayMs);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
            filterChain.doFilter(request, response);
            return;
        }

        // Tier 3: Massive scraping lockdown (> 25 requests / 10s) -> HTTP 429 Too Many Requests + ACD Intrusion Alert
        logger.error("🚨 [DLP_LOCKDOWN] Scraping burst threshold breached ({} req/10s) from IP: {} on URI: {}",
                requestCount, clientIp, uri);

        if (activeCyberDefenseService != null) {
            String details = String.format("Massive automated scraping burst: %d requests in 10s window on endpoint %s",
                    requestCount, uri);
            activeCyberDefenseService.recordIntrusionAlert("DLP_SCRAPING_BURST", clientIp, username, details, "TARPIT_AND_LOCKOUT_429");
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", "60");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\": 429, \"error\": \"Too Many Requests\", \"message\": \"Massive automated scraping burst detected. Tactical DLP throttling activated.\", \"retryAfter\": 60}");
    }

    private String extractUsernameFromToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ") && jwtUtil != null) {
            try {
                String token = authHeader.substring(7);
                return jwtUtil.extractUsername(token);
            } catch (Exception e) {
                logger.debug("Failed to extract username from token for DLP tracking: {}", e.getMessage());
            }
        }
        return null;
    }

    /**
     * Records a request timestamp for a tracking key (useful for tests or external tracking).
     */
    public void recordRequest(String trackingKey, long timestamp) {
        Queue<Long> timestamps = requestHistory.computeIfAbsent(trackingKey, k -> new ConcurrentLinkedQueue<>());
        timestamps.add(timestamp);
    }

    /**
     * Returns the active sliding window request count for a tracking key.
     */
    public int getRequestCount(String trackingKey) {
        Queue<Long> timestamps = requestHistory.get(trackingKey);
        return timestamps != null ? timestamps.size() : 0;
    }

    /**
     * Clears sliding window history for testing purposes.
     */
    public void clear() {
        requestHistory.clear();
    }
}
