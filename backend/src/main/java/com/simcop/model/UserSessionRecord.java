package com.simcop.model;

import com.simcop.model.embeddable.GeoLocation;

/**
 * Record holding session telemetry for a user (username, token, IP, location, timestamp).
 */
public class UserSessionRecord {
    private String username;
    private String token;
    private String ip;
    private GeoLocation loc;
    private long timestamp;

    public UserSessionRecord() {
    }

    public UserSessionRecord(String username, String token, String ip, GeoLocation loc, long timestamp) {
        this.username = username;
        this.token = token;
        this.ip = ip;
        this.loc = loc;
        this.timestamp = timestamp;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public GeoLocation getLoc() {
        return loc;
    }

    public void setLoc(GeoLocation loc) {
        this.loc = loc;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}
