package com.simcop.service;

import com.simcop.model.embeddable.GeoLocation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Offline, air-gapped IP-to-GeoLocation resolution service.
 * Operates deterministically without external API queries or DNS leaks.
 */
@Service
public class GeoIpService {

    private static final Logger logger = LoggerFactory.getLogger(GeoIpService.class);

    public static final GeoLocation BOGOTA_HQ = new GeoLocation(4.7110, -74.0721);
    public static final GeoLocation MOSCOW_RU = new GeoLocation(55.7558, 37.6173);
    public static final GeoLocation WASHINGTON_US = new GeoLocation(38.9072, -77.0369);
    public static final GeoLocation FRANKFURT_EU = new GeoLocation(50.1109, 8.6821);

    /**
     * Resolves an IP address to geographical coordinates.
     */
    public GeoLocation resolveIp(String ip) {
        if (ip == null || ip.trim().isEmpty()) {
            return BOGOTA_HQ;
        }

        String cleanIp = ip.trim();
        // Handle X-Forwarded-For multi-IP chains
        if (cleanIp.contains(",")) {
            cleanIp = cleanIp.split(",")[0].trim();
        }

        // Strip IPv4 port if present (e.g. 192.168.1.1:8080)
        if (cleanIp.contains(":") && cleanIp.indexOf(':') == cleanIp.lastIndexOf(':')) {
            cleanIp = cleanIp.substring(0, cleanIp.indexOf(':'));
        }

        // Localhost / Loopback IPv6 / IPv4
        if ("127.0.0.1".equals(cleanIp) || "::1".equals(cleanIp) || "0:0:0:0:0:0:0:1".equals(cleanIp) || "localhost".equalsIgnoreCase(cleanIp)) {
            return BOGOTA_HQ;
        }

        try {
            String[] parts = cleanIp.split("\\.");
            if (parts.length == 4) {
                int o1 = Integer.parseInt(parts[0].trim());
                int o2 = Integer.parseInt(parts[1].trim());

                // 1. Private RFC 1918 & Local
                if (o1 == 10 || o1 == 127) {
                    return BOGOTA_HQ;
                }
                if (o1 == 172 && (o2 >= 16 && o2 <= 31)) {
                    return BOGOTA_HQ;
                }
                if (o1 == 192 && o2 == 168) {
                    return BOGOTA_HQ;
                }

                // 2. Colombian Public Subnets
                if (o1 == 181 || o1 == 190 || o1 == 186 || o1 == 200) {
                    return BOGOTA_HQ;
                }

                // 3. Foreign Subnets: Russia
                if (o1 == 178 || o1 == 95 || o1 == 188 || o1 == 91) {
                    return MOSCOW_RU;
                }

                // 4. Foreign Subnets: USA (East Coast / Ashburn)
                if (o1 == 54 || o1 == 3 || o1 == 128 || (o1 == 198 && o2 == 51)) {
                    return WASHINGTON_US;
                }

                // 5. Foreign Subnets: Europe (Frankfurt)
                if (o1 == 80 || o1 == 82 || o1 == 195) {
                    return FRANKFURT_EU;
                }
            }
        } catch (Exception e) {
            logger.debug("Failed to parse IP for geo-resolution: {}", cleanIp);
        }

        // Default to Command Headquarters
        return BOGOTA_HQ;
    }
}
