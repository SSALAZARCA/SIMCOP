package com.sigep.model;

import jakarta.persistence.*;

@Entity
@Table(name = "sigep_users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role; // Ej: ROLE_ADMINISTRATOR, ROLE_JEFE_PERSONAL_DIVISION

    @Column(name = "assigned_unit_id")
    private String assignedUnitId;

    private String displayName;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    
    public String getAssignedUnitId() { return assignedUnitId; }
    public void setAssignedUnitId(String assignedUnitId) { this.assignedUnitId = assignedUnitId; }
    
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
}
