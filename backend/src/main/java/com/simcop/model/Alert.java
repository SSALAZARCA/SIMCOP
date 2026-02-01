package com.simcop.model;

import com.simcop.model.embeddable.GeoLocation;
import jakarta.persistence.*;

@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    private String id;

    @Enumerated(EnumType.STRING)
    private AlertType type;

    private String unitId;
    private String intelId;
    private String q5Id;
    private String ordopId;
    private String userId;

    private String message;
    private long timestamp;

    @Enumerated(EnumType.STRING)
    private AlertSeverity severity;

    private boolean acknowledged;

    @Embedded
    private GeoLocation location;

    // Data field can be JSON string
    @Column(columnDefinition = "TEXT")
    private String data;

    public Alert() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public AlertType getType() { return type; }
    public void setType(AlertType type) { this.type = type; }

    public String getUnitId() { return unitId; }
    public void setUnitId(String unitId) { this.unitId = unitId; }

    public String getIntelId() { return intelId; }
    public void setIntelId(String intelId) { this.intelId = intelId; }

    public String getQ5Id() { return q5Id; }
    public void setQ5Id(String q5Id) { this.q5Id = q5Id; }

    public String getOrdopId() { return ordopId; }
    public void setOrdopId(String ordopId) { this.ordopId = ordopId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public AlertSeverity getSeverity() { return severity; }
    public void setSeverity(AlertSeverity severity) { this.severity = severity; }

    public boolean isAcknowledged() { return acknowledged; }
    public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }

    public GeoLocation getLocation() { return location; }
    public void setLocation(GeoLocation location) { this.location = location; }

    public String getData() { return data; }
    public void setData(String data) { this.data = data; }
}
