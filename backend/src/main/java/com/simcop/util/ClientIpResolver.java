package com.simcop.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Utility to extract client IP addresses securely, supporting reverse proxies
 * (X-Forwarded-For, X-Real-IP) with fallback to remote address.
 */
public class ClientIpResolver {

    private ClientIpResolver() {
        // Utility class
    }

    public static String getClientIp(HttpServletRequest request) {
        if (request == null) {
            return "UNKNOWN";
        }

        // 1. Check X-Forwarded-For header (first IP in comma-separated list)
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.trim().isEmpty()) {
            String[] ips = xForwardedFor.split(",");
            if (ips.length > 0 && !ips[0].trim().isEmpty()) {
                return ips[0].trim();
            }
        }

        // 2. Check X-Real-IP header
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.trim().isEmpty()) {
            return xRealIp.trim();
        }

        // 3. Fallback to direct remote address
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr != null && !remoteAddr.trim().isEmpty()) {
            return remoteAddr.trim();
        }

        return "UNKNOWN";
    }
}
