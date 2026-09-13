package com.simcop.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.simcop.model.User;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO {

    private String id;
    private String username;
    private String email;
    private String role;
    private String displayName;
    private Boolean twoFactorEnabled;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant updatedAt;

    private Boolean active;
    private List<String> permissions = new ArrayList<>();
    private String assignedUnitId;
    private String telegramChatId;
    private String token;

    public UserDTO() {
    }

    public UserDTO(String id, String username, String email, String role, Boolean twoFactorEnabled, Instant createdAt, Instant updatedAt, Boolean active) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.role = role;
        this.twoFactorEnabled = twoFactorEnabled;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.active = active;
    }

    public static UserDTO fromEntity(User user) {
        if (user == null) {
            return null;
        }
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setDisplayName(user.getDisplayName());
        dto.setRole(user.getRole() != null ? user.getRole().name() : null);
        dto.setTwoFactorEnabled(user.getTwoFactorEnabled());
        dto.setPermissions(user.getPermissions() != null ? new ArrayList<>(user.getPermissions()) : new ArrayList<>());
        dto.setAssignedUnitId(user.getAssignedUnitId());
        dto.setTelegramChatId(user.getTelegramChatId());
        dto.setToken(user.getToken());
        dto.setActive(true);
        dto.setCreatedAt(Instant.now());
        dto.setUpdatedAt(Instant.now());
        return dto;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Boolean getTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(Boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
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
}
