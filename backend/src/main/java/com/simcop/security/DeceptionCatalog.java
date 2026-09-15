package com.simcop.security;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Immutable catalog for Active Cyber Defense (ACD) deception tactics.
 * Stores honeypot trap accounts (honey-users) and reconnaissance tripwire routes (canary endpoints).
 */
public final class DeceptionCatalog {

    private DeceptionCatalog() {
        // Prevent instantiation
    }

    /**
     * Decoy honeypot user accounts. Any authentication attempt targeting these usernames
     * triggers instant 24-hour IP isolation and critical intrusion alerting.
     */
    public static final Set<String> HONEY_USERS = Collections.unmodifiableSet(new HashSet<>(Set.of(
            "c4isr_admin",
            "general.rodriguez",
            "root",
            "backup_admin",
            "superadmin_test"
    )));

    /**
     * Decoy tripwire paths designed to detect automated vulnerability scanners and crawlers.
     */
    public static final Set<String> CANARY_ENDPOINTS = Collections.unmodifiableSet(new HashSet<>(Set.of(
            "/.env",
            "/admin.php",
            "/api/debug/dump",
            "/actuator/env",
            "/wp-login.php"
    )));

    /**
     * Checks if the given username corresponds to an active honeypot decoy account.
     *
     * @param username username to evaluate
     * @return true if the username is an active honey-user
     */
    public static boolean isHoneyUser(String username) {
        if (username == null || username.trim().isEmpty()) {
            return false;
        }
        return HONEY_USERS.contains(username.trim().toLowerCase());
    }

    /**
     * Checks if the requested URI corresponds to a canary tripwire decoy endpoint.
     *
     * @param uri URI path to evaluate
     * @return true if the URI matches a canary endpoint
     */
    public static boolean isCanaryEndpoint(String uri) {
        if (uri == null || uri.trim().isEmpty()) {
            return false;
        }
        String cleanUri = uri.trim().toLowerCase().replaceAll("//+", "/");

        // Strip query parameters if present
        int queryIndex = cleanUri.indexOf('?');
        if (queryIndex != -1) {
            cleanUri = cleanUri.substring(0, queryIndex);
        }

        // Strip trailing slash if present (except root '/')
        if (cleanUri.length() > 1 && cleanUri.endsWith("/")) {
            cleanUri = cleanUri.substring(0, cleanUri.length() - 1);
        }

        for (String canary : CANARY_ENDPOINTS) {
            if (cleanUri.equals(canary) || cleanUri.startsWith(canary + "/")) {
                return true;
            }
        }
        return false;
    }

    public static Set<String> getHoneyUsers() {
        return HONEY_USERS;
    }

    public static Set<String> getCanaryEndpoints() {
        return CANARY_ENDPOINTS;
    }
}
