package com.simcop.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "users")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_WRITE)
    private String token;

    @Column(unique = true, nullable = false)
    private String username;

    private String displayName;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    @com.fasterxml.jackson.annotation.JsonAlias({"password", "hashedPassword"})
    private String hashedPassword;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @ElementCollection
    @CollectionTable(name = "user_permissions", joinColumns = @JoinColumn(name = "user_id"))
    private List<String> permissions = new ArrayList<>(); // Storing ViewType as Strings

    private String assignedUnitId;

    @Column(name = "telegram_chat_id")
    private String telegramChatId;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "two_factor_secret")
    private String twoFactorSecret;

    @Column(name = "is_two_factor_enabled")
    @com.fasterxml.jackson.annotation.JsonProperty("twoFactorEnabled")
    private Boolean isTwoFactorEnabled = false;

    @Transient
    private String totpCode;

    public User() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getHashedPassword() {
        return hashedPassword;
    }

    public void setHashedPassword(String hashedPassword) {
        this.hashedPassword = hashedPassword;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions = permissions;
    }

    public String getAssignedUnitId() {
        return assignedUnitId;
    }

    public void setAssignedUnitId(String assignedUnitId) {
        this.assignedUnitId = assignedUnitId;
    }

    public String getTelegramChatId() {
        return telegramChatId;
    }

    public void setTelegramChatId(String telegramChatId) {
        this.telegramChatId = telegramChatId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTwoFactorSecret() {
        return twoFactorSecret;
    }

    public void setTwoFactorSecret(String twoFactorSecret) {
        this.twoFactorSecret = twoFactorSecret;
    }

    public Boolean getTwoFactorEnabled() {
        return isTwoFactorEnabled != null ? isTwoFactorEnabled : false;
    }

    public void setTwoFactorEnabled(Boolean twoFactorEnabled) {
        this.isTwoFactorEnabled = twoFactorEnabled;
    }

    public String getTotpCode() {
        return totpCode;
    }

    public void setTotpCode(String totpCode) {
        this.totpCode = totpCode;
    }
}
