package com.simcop.security;

import com.simcop.config.CachedBodyHttpServletRequest;
import com.simcop.model.AdminAuditLog;
import com.simcop.repository.AdminAuditLogRepository;
import com.simcop.service.LoginRateLimiterService;
import com.simcop.util.ClientIpResolver;
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
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * Runtime Application Self-Protection (RASP) filter.
 * Intercepts and neutralizes SQL Injection, Path Traversal, Command Injection,
 * and automated vulnerability scanner payloads in real-time.
 */
@Component
public class RaspFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RaspFilter.class);

    @Autowired
    private LoginRateLimiterService loginRateLimiterService;

    @Autowired(required = false)
    private AdminAuditLogRepository auditLogRepository;

    @Autowired(required = false)
    private com.simcop.service.ActiveCyberDefenseService activeCyberDefenseService;

    private static final String[] SCANNER_USER_AGENTS = {
            "sqlmap", "nikto", "dirbuster", "gobuster", "wpscan", "nmap"
    };

    private static final Pattern SQLI_PATTERN = Pattern.compile(
            "(?i)(\\bunion(/\\*.*?\\*/|\\s)+(all(/\\*.*?\\*/|\\s)+)?select\\b|'\\s*or\\s*'?1'?\\s*=\\s*'?1|\\bor\\s+1\\s*=\\s*1\\b|\\bdrop\\s+table\\b|\\bexec\\s*\\()",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PATH_TRAVERSAL_PATTERN = Pattern.compile(
            "(\\.\\./|\\.\\.\\\\|/etc/passwd|%2e%2e)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern CMD_INJECTION_PATTERN = Pattern.compile(
            "(;\\s*cat\\s+|\\|\\s*whoami\\b|&&\\s*(cat|ls|whoami|sh|bash|nc|curl|wget|rm|chmod|ping|powershell|cmd)\\b)",
            Pattern.CASE_INSENSITIVE
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = ClientIpResolver.getClientIp(request);

        // 1. Inspect User-Agent for known vulnerability scanners
        String userAgent = request.getHeader("User-Agent");
        String scannerAttack = detectScannerUserAgent(userAgent);
        if (scannerAttack != null) {
            handleAttackDetected(request, response, clientIp, scannerAttack);
            return;
        }

        // 2. Inspect Request URI and Query String
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();

        String uriAttack = inspectText(uri);
        if (uriAttack != null) {
            handleAttackDetected(request, response, clientIp, uriAttack + " in URI: " + uri);
            return;
        }

        if (queryString != null && !queryString.trim().isEmpty()) {
            String queryAttack = inspectText(queryString);
            if (queryAttack != null) {
                handleAttackDetected(request, response, clientIp, queryAttack + " in Query: " + queryString);
                return;
            }
        }

        // 3. Inspect Request Body (skipping multipart uploads)
        String contentType = request.getContentType();
        boolean isMultipart = contentType != null && contentType.toLowerCase().startsWith("multipart/");

        if (isMultipart) {
            // Multipart uploads are processed directly to avoid buffering large files in memory
            filterChain.doFilter(request, response);
            return;
        }

        // Wrap body for RASP inspection and downstream controller reuse
        CachedBodyHttpServletRequest wrappedRequest = (request instanceof CachedBodyHttpServletRequest)
                ? (CachedBodyHttpServletRequest) request
                : new CachedBodyHttpServletRequest(request);

        byte[] bodyBytes = wrappedRequest.getCachedBody();
        if (bodyBytes != null && bodyBytes.length > 0) {
            String bodyText = new String(bodyBytes, StandardCharsets.UTF_8);
            String bodyAttack = inspectText(bodyText);
            if (bodyAttack != null) {
                handleAttackDetected(request, response, clientIp, bodyAttack + " in Body");
                return;
            }
        }

        filterChain.doFilter(wrappedRequest, response);
    }

    private String detectScannerUserAgent(String userAgent) {
        if (userAgent == null || userAgent.trim().isEmpty()) {
            return null;
        }
        String lowerAgent = userAgent.toLowerCase();
        for (String scanner : SCANNER_USER_AGENTS) {
            if (lowerAgent.contains(scanner)) {
                return "SCANNER_USER_AGENT: " + scanner;
            }
        }
        return null;
    }

    private String inspectText(String rawText) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return null;
        }
        String attack = detectPatternMatch(rawText);
        if (attack != null) {
            return attack;
        }

        // If URL encoded characters are present, inspect the decoded text as well
        if (rawText.contains("%")) {
            try {
                String decoded = URLDecoder.decode(rawText, StandardCharsets.UTF_8);
                attack = detectPatternMatch(decoded);
                if (attack != null) {
                    return attack;
                }
            } catch (Exception ignored) {
                // Ignore decoding errors
            }
        }

        return null;
    }

    private String detectPatternMatch(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }

        // Normalize SQL inline comments before inspection
        String normalized = text.replaceAll("/\\*.*?\\*/", " ");

        if (SQLI_PATTERN.matcher(text).find()
                || SQLI_PATTERN.matcher(normalized).find()
                || text.toUpperCase().contains("UNION SELECT")
                || normalized.toUpperCase().contains("UNION SELECT")
                || text.toUpperCase().contains("' OR '1'='1")
                || text.toUpperCase().contains("OR 1=1")
                || text.toUpperCase().contains("DROP TABLE")
                || text.toUpperCase().contains("EXEC(")) {
            return "SQL_INJECTION";
        }

        if (PATH_TRAVERSAL_PATTERN.matcher(text).find()
                || text.contains("../")
                || text.contains("..\\")
                || text.contains("/etc/passwd")
                || text.toLowerCase().contains("%2e%2e")) {
            return "PATH_TRAVERSAL";
        }

        if (CMD_INJECTION_PATTERN.matcher(text).find()
                || text.contains("; cat ")
                || text.contains("| whoami")) {
            return "COMMAND_INJECTION";
        }

        return null;
    }

    private void handleAttackDetected(HttpServletRequest request, HttpServletResponse response, String clientIp, String attackType)
            throws IOException {

        logger.warn("🚨 [RASP_DEFENSE] Offensive payload intercepted from IP: {} on URI: {} [Type: {}]",
                clientIp, request.getRequestURI(), attackType);

        // 1. Tarpit delay to frustrate automated attackers and rate scanners
        try {
            Thread.sleep(1000);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }

        // 2. Persist forensic event to AdminAuditLogRepository (RASP_DEFENSE)
        if (auditLogRepository != null) {
            try {
                auditLogRepository.save(new AdminAuditLog(
                        System.currentTimeMillis(),
                        "RASP_DEFENSE",
                        "OFFENSIVE_PAYLOAD_BLOCKED",
                        clientIp,
                        String.format("Attack type: %s, URI: %s, IP isolated for 24h", attackType, request.getRequestURI())
                ));
            } catch (Exception e) {
                logger.error("Error persisting RASP forensic audit log: {}", e.getMessage());
            }
        }

        // 3. Dispatch ACD intrusion alert (isolates IP for 24h, logs ACD audit, saves alert, alerts Telegram)
        if (activeCyberDefenseService != null) {
            activeCyberDefenseService.recordIntrusionAlert(
                    "RASP_ATTACK",
                    clientIp,
                    null,
                    String.format("Attack type: %s, URI: %s", attackType, request.getRequestURI()),
                    "TARPIT_AND_ISOLATE_24H"
            );
        } else if (loginRateLimiterService != null) {
            loginRateLimiterService.blacklistIp(clientIp, 24 * 3600 * 1000L, "RASP_ATTACK: " + attackType);
        }

        // 4. Return generic HTTP 400 Bad Request
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\": 400, \"error\": \"Bad Request\", \"message\": \"Invalid request payload detected\"}");
    }
}
