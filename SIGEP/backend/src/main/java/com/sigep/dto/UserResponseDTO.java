package com.sigep.dto;

import com.sigep.model.User;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponseDTO {

    private Long id;
    private String username;
    private String role;
    private String assignedUnitId;
    private String displayName;
    private String fullName;
    private String rank;
    private String createdAt;
    private String updatedAt;
    @Builder.Default
    private boolean enabled = true;

    /**
     * Masks the password attribute to ensure real credentials or hashes
     * are never leaked through the API.
     */
    @JsonProperty("hashedPassword")
    public String getHashedPassword() {
        return "[PROTECTED_BCRYPT]";
    }

    public static UserResponseDTO fromEntity(User user) {
        if (user == null) {
            return null;
        }
        UserResponseDTO dto = new UserResponseDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setRole(user.getRole());
        dto.setAssignedUnitId(user.getAssignedUnitId());
        dto.setDisplayName(user.getDisplayName());
        dto.setFullName(user.getDisplayName());
        dto.setEnabled(true);
        return dto;
    }

    // Explicit getters and setters to ensure resilience independent of annotation processors
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getAssignedUnitId() { return assignedUnitId; }
    public void setAssignedUnitId(String assignedUnitId) { this.assignedUnitId = assignedUnitId; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getFullName() { return fullName != null ? fullName : displayName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRank() { return rank; }
    public void setRank(String rank) { this.rank = rank; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
