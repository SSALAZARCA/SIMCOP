package com.simcop.security;

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

/**
 * Filter that trips on reconnaissance requests targeting deception canary routes
 * (e.g., /.env, /admin.php, /api/debug/dump, /actuator/env, /wp-login.php).
 * Automatically isolates the scanner IP for 24 hours and returns HTTP 404 Not Found.
 */
@Component
public class CanaryEndpointFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(CanaryEndpointFilter.class);

    @Autowired
    private LoginRateLimiterService loginRateLimiterService;

    @Autowired(required = false)
    private AdminAuditLogRepository auditLogRepository;

    @Autowired(required = false)
    private com.simcop.service.ActiveCyberDefenseService activeCyberDefenseService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        if ((uri == null || uri.isEmpty() || uri.equals("/")) && request.getServerName() != null) {
            String serverName = request.getServerName();
            if (DeceptionCatalog.isCanaryEndpoint("/" + serverName)) {
                uri = "/" + serverName;
            }
        }

        if (DeceptionCatalog.isCanaryEndpoint(uri)) {
            String clientIp = ClientIpResolver.getClientIp(request);
            logger.warn("🚨 [CANARY_DECEPTION] Reconnaissance probe detected on canary decoy path: {} from IP: {}", uri, clientIp);

            if (auditLogRepository != null) {
                try {
                    auditLogRepository.save(new AdminAuditLog(
                            System.currentTimeMillis(),
                            "CANARY_ENDPOINT_TRIGGERED",
                            "RECONNAISSANCE_PROBE",
                            uri,
                            String.format("Reconnaissance attempt on canary decoy endpoint %s from IP %s", uri, clientIp)
                    ));
                } catch (Exception e) {
                    logger.error("Error persisting canary audit log: {}", e.getMessage());
                }
            }

            if (activeCyberDefenseService != null) {
                activeCyberDefenseService.recordIntrusionAlert(
                        "CANARY_ENDPOINT_TRIGGERED",
                        clientIp,
                        null,
                        "Reconnaissance attempt on canary decoy endpoint " + uri,
                        "IP_ISOLATED_24H"
                );
            } else if (loginRateLimiterService != null) {
                loginRateLimiterService.blacklistIp(clientIp, 24 * 3600 * 1000L, "CANARY_PROBING: " + uri);
            }

            response.setStatus(HttpStatus.NOT_FOUND.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\": \"Not Found\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
