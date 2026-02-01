package com.simcop.model;

import com.simcop.model.embeddable.GeoLocation;
import jakarta.persistence.*;

@Entity
@Table(name = "forward_observers")
public class ForwardObserver {

    @Id
    private String id;

    private String callsign;

    @Embedded
    private GeoLocation location;

    @Enumerated(EnumType.STRING)
    private ForwardObserverStatus status;

    private String assignedUnitId;
    private String commanderId;

    public ForwardObserver() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCallsign() { return callsign; }
    public void setCallsign(String callsign) { this.callsign = callsign; }

    public GeoLocation getLocation() { return location; }
    public void setLocation(GeoLocation location) { this.location = location; }

    public ForwardObserverStatus getStatus() { return status; }
    public void setStatus(ForwardObserverStatus status) { this.status = status; }

    public String getAssignedUnitId() { return assignedUnitId; }
    public void setAssignedUnitId(String assignedUnitId) { this.assignedUnitId = assignedUnitId; }

    public String getCommanderId() { return commanderId; }
    public void setCommanderId(String commanderId) { this.commanderId = commanderId; }
}
