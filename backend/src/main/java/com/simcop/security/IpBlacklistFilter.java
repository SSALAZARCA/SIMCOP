package com.simcop.security;

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
 * Filter that intercepts incoming requests and isolates blacklisted IP addresses.
 * Positioned at the very top of the security filter chain.
 */
@Component
public class IpBlacklistFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(IpBlacklistFilter.class);

    @Autowired
    private LoginRateLimiterService loginRateLimiterService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = ClientIpResolver.getClientIp(request);

        if (loginRateLimiterService != null && loginRateLimiterService.isIpBlacklisted(clientIp)) {
            logger.warn("🚫 [IP_BLACKLIST] Request rejected from isolated IP: {} to URI: {}", clientIp, request.getRequestURI());
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\": \"Access Denied\", \"message\": \"IP address has been isolated due to security policy violations\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
