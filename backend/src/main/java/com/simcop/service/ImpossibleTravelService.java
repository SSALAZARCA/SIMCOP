package com.simcop.service;

import com.simcop.model.UserSessionRecord;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.util.GeoUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Anomaly detection engine that identifies physically impossible geographic relocation
 * of user sessions (Impossible Travel / Velocity Anomaly).
 */
@Service
public class ImpossibleTravelService {

    private static final Logger logger = LoggerFactory.getLogger(ImpossibleTravelService.class);

    private final GeoIpService geoIpService;
    private final SessionTrackingService sessionTrackingService;
    private final ActiveCyberDefenseService activeCyberDefenseService;

    @Autowired
    public ImpossibleTravelService(
            @Autowired(required = false) GeoIpService geoIpService,
            @Autowired(required = false) SessionTrackingService sessionTrackingService,
            @Autowired(required = false) ActiveCyberDefenseService activeCyberDefenseService) {
        this.geoIpService = (geoIpService != null) ? geoIpService : new GeoIpService();
        this.sessionTrackingService = (sessionTrackingService != null) ? sessionTrackingService : new SessionTrackingService();
        this.activeCyberDefenseService = activeCyberDefenseService;
    }

    /**
     * Inspects whether a request from clientIp for username represents an impossible travel anomaly.
     *
     * @param username The authenticated username
     * @param clientIp The origin IP of the current request
     * @param token    The current JWT token
     * @return true if impossible travel is confirmed and the session has been revoked; false if benign.
     */
    public boolean checkTravelAnomaly(String username, String clientIp, String token) {
        if (username == null || clientIp == null) {
            return false;
        }

        GeoLocation currentLoc = geoIpService.resolveIp(clientIp);
        UserSessionRecord prev = sessionTrackingService.getLastSession(username);

        if (prev != null && prev.getLoc() != null) {
            double distanceMeters = GeoUtils.calculateDistanceMeters(prev.getLoc(), currentLoc);
            double distanceKm = distanceMeters / 1000.0;
            long elapsedMillis = System.currentTimeMillis() - prev.getTimestamp();
            double deltaHours = elapsedMillis / 3600000.0;
            double velocityKmH = distanceKm / Math.max(deltaHours, 0.001);

            logger.debug("Travel evaluation for user {}: Distance={:.1f}km, dt={:.4f}h, Speed={:.1f}km/h (from {} to {})",
                    username, distanceKm, deltaHours, velocityKmH, prev.getIp(), clientIp);

            // Invariant: Distance > 500 km and Velocity > 1000 km/h represents an impossible travel anomaly
            if (distanceKm > 500.0 && velocityKmH > 1000.0) {
                logger.warn("🚨 [IMPOSSIBLE_TRAVEL_CONFIRMED] User: {}, Distance: {:.1f}km, Speed: {:.1f}km/h, PrevIP: {}, CurrIP: {}",
                        username, distanceKm, velocityKmH, prev.getIp(), clientIp);

                // 1. Immediately revoke all user sessions and blacklist token
                sessionTrackingService.revokeUser(username);
                if (token != null) {
                    sessionTrackingService.revokeToken(token);
                }

                // 2. Dispatch ACD alert and notify Superadmin via Telegram
                String details = String.format(Locale.US, "Distance: %.1f km in %.2f hours (Speed: %.1f km/h) from %s to %s",
                        distanceKm, Math.max(deltaHours, 0.0), velocityKmH, prev.getIp(), clientIp);

                if (activeCyberDefenseService != null) {
                    activeCyberDefenseService.recordIntrusionAlert("IMPOSSIBLE_TRAVEL", clientIp, username, details, "SESSION_REVOKED");
                }

                return true;
            }
        }

        // Update session tracking record with current location and timestamp
        sessionTrackingService.updateSession(username, clientIp, currentLoc, System.currentTimeMillis());
        return false;
    }

    public GeoIpService getGeoIpService() {
        return geoIpService;
    }

    public SessionTrackingService getSessionTrackingService() {
        return sessionTrackingService;
    }

    public ActiveCyberDefenseService getActiveCyberDefenseService() {
        return activeCyberDefenseService;
    }
}
