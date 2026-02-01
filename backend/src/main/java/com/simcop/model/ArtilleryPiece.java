package com.simcop.model;

import com.simcop.model.embeddable.AmmoStock;
import com.simcop.model.embeddable.GeoLocation;
import jakarta.persistence.*;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "artillery_pieces")
public class ArtilleryPiece {

    @Id
    private String id;

    private String name;

    @Enumerated(EnumType.STRING)
    private ArtilleryType type;

    @Embedded
    private GeoLocation location;

    @Enumerated(EnumType.STRING)
    private ArtilleryStatus status;

    @ElementCollection
    @CollectionTable(name = "artillery_ammo", joinColumns = @JoinColumn(name = "artillery_id"))
    private List<AmmoStock> ammunition = new ArrayList<>();

    private double minRange;
    private double maxRange;
    private String assignedUnitId;
    private String commanderId;
    private String directorTiroId;

    public ArtilleryPiece() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ArtilleryType getType() { return type; }
    public void setType(ArtilleryType type) { this.type = type; }

    public GeoLocation getLocation() { return location; }
    public void setLocation(GeoLocation location) { this.location = location; }

    public ArtilleryStatus getStatus() { return status; }
    public void setStatus(ArtilleryStatus status) { this.status = status; }

    public List<AmmoStock> getAmmunition() { return ammunition; }
    public void setAmmunition(List<AmmoStock> ammunition) { this.ammunition = ammunition; }

    public double getMinRange() { return minRange; }
    public void setMinRange(double minRange) { this.minRange = minRange; }

    public double getMaxRange() { return maxRange; }
    public void setMaxRange(double maxRange) { this.maxRange = maxRange; }

    public String getAssignedUnitId() { return assignedUnitId; }
    public void setAssignedUnitId(String assignedUnitId) { this.assignedUnitId = assignedUnitId; }

    public String getCommanderId() { return commanderId; }
    public void setCommanderId(String commanderId) { this.commanderId = commanderId; }

    public String getDirectorTiroId() { return directorTiroId; }
    public void setDirectorTiroId(String directorTiroId) { this.directorTiroId = directorTiroId; }
}
