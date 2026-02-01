package com.simcop.model;

import com.simcop.model.embeddable.CommanderInfo;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.model.embeddable.PersonnelBreakdown;
import com.simcop.model.embeddable.RoutePoint;
import com.simcop.model.embeddable.UAVAsset;
import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "military_units")
public class MilitaryUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    @Enumerated(EnumType.STRING)
    private UnitType type;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "rank", column = @Column(name = "commander_rank")),
            @AttributeOverride(name = "name", column = @Column(name = "commander_name"))
    })
    private CommanderInfo commander;

    @Embedded
    private PersonnelBreakdown personnelBreakdown;

    @ElementCollection
    @Fetch(FetchMode.SUBSELECT)
    private List<String> equipment = new ArrayList<>();

    @ElementCollection
    @Fetch(FetchMode.SUBSELECT)
    private List<String> capabilities = new ArrayList<>();

    @Embedded
    private GeoLocation location;

    @Enumerated(EnumType.STRING)
    private UnitStatus status;

    private long lastMovementTimestamp;
    private long lastCommunicationTimestamp;
    private Long lastHourlyReportTimestamp;

    @ElementCollection
    @CollectionTable(name = "unit_route_history", joinColumns = @JoinColumn(name = "unit_id"))
    private List<RoutePoint> routeHistory = new ArrayList<>();

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "lat", column = @Column(name = "destination_lat")),
            @AttributeOverride(name = "lon", column = @Column(name = "destination_lon"))
    })
    private GeoLocation destination;

    private Double eta;
    private Double fuelLevel;
    private Double ammoLevel;
    private Double daysOfSupply;
    private Long lastResupplyDate;
    private Long combatEndTimestamp;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "lat", column = @Column(name = "combat_end_lat")),
            @AttributeOverride(name = "lon", column = @Column(name = "combat_end_lon"))
    })
    private GeoLocation combatEndLocation;

    private Long leaveStartDate;
    private Integer leaveDurationDays;
    private Long retrainingStartDate;
    private String retrainingFocus;
    private Integer retrainingDurationDays;
    private String currentMission;
    private String unitSituationType;
    private String parentId;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "authorizedPersonnel.officers", column = @Column(name = "toe_officers")),
            @AttributeOverride(name = "authorizedPersonnel.ncos", column = @Column(name = "toe_ncos")),
            @AttributeOverride(name = "authorizedPersonnel.professionalSoldiers", column = @Column(name = "toe_prof_soldiers")),
            @AttributeOverride(name = "authorizedPersonnel.regularSoldiers", column = @Column(name = "toe_reg_soldiers")),
            @AttributeOverride(name = "authorizedPersonnel.civilians", column = @Column(name = "toe_civilians"))
    })
    private TOEInformation toe;

    // SIOCH Interoperability Fields
    private Double publicOrderIndex;
    private Integer criticalityLevel;

    @OneToMany(mappedBy = "unit", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Fetch(FetchMode.SUBSELECT)
    private List<Soldier> personnelList = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "unit_uav_assets", joinColumns = @JoinColumn(name = "unit_id"))
    @Fetch(FetchMode.SUBSELECT)
    private List<UAVAsset> uavAssets = new ArrayList<>();

    public MilitaryUnit() {
        this.personnelBreakdown = new PersonnelBreakdown();
        this.toe = new TOEInformation();
        this.commander = new CommanderInfo();
        this.location = new GeoLocation();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UnitType getType() {
        return type;
    }

    public void setType(UnitType type) {
        this.type = type;
    }

    public CommanderInfo getCommander() {
        return commander;
    }

    public void setCommander(CommanderInfo commander) {
        this.commander = commander;
    }

    public PersonnelBreakdown getPersonnelBreakdown() {
        return personnelBreakdown;
    }

    public void setPersonnelBreakdown(PersonnelBreakdown personnelBreakdown) {
        this.personnelBreakdown = personnelBreakdown;
    }

    public List<String> getEquipment() {
        return equipment;
    }

    public void setEquipment(List<String> equipment) {
        this.equipment = equipment;
    }

    public List<String> getCapabilities() {
        return capabilities;
    }

    public void setCapabilities(List<String> capabilities) {
        this.capabilities = capabilities;
    }

    public GeoLocation getLocation() {
        return location;
    }

    public void setLocation(GeoLocation location) {
        this.location = location;
    }

    public UnitStatus getStatus() {
        return status;
    }

    public void setStatus(UnitStatus status) {
        this.status = status;
    }

    public long getLastMovementTimestamp() {
        return lastMovementTimestamp;
    }

    public void setLastMovementTimestamp(long lastMovementTimestamp) {
        this.lastMovementTimestamp = lastMovementTimestamp;
    }

    public long getLastCommunicationTimestamp() {
        return lastCommunicationTimestamp;
    }

    public void setLastCommunicationTimestamp(long lastCommunicationTimestamp) {
        this.lastCommunicationTimestamp = lastCommunicationTimestamp;
    }

    public Long getLastHourlyReportTimestamp() {
        return lastHourlyReportTimestamp;
    }

    public void setLastHourlyReportTimestamp(Long lastHourlyReportTimestamp) {
        this.lastHourlyReportTimestamp = lastHourlyReportTimestamp;
    }

    public List<RoutePoint> getRouteHistory() {
        return routeHistory;
    }

    public void setRouteHistory(List<RoutePoint> routeHistory) {
        this.routeHistory = routeHistory;
    }

    public GeoLocation getDestination() {
        return destination;
    }

    public void setDestination(GeoLocation destination) {
        this.destination = destination;
    }

    public Double getEta() {
        return eta;
    }

    public void setEta(Double eta) {
        this.eta = eta;
    }

    public Double getFuelLevel() {
        return fuelLevel;
    }

    public void setFuelLevel(Double fuelLevel) {
        this.fuelLevel = fuelLevel;
    }

    public Double getAmmoLevel() {
        return ammoLevel;
    }

    public void setAmmoLevel(Double ammoLevel) {
        this.ammoLevel = ammoLevel;
    }

    public Double getDaysOfSupply() {
        return daysOfSupply;
    }

    public void setDaysOfSupply(Double daysOfSupply) {
        this.daysOfSupply = daysOfSupply;
    }

    public Long getLastResupplyDate() {
        return lastResupplyDate;
    }

    public void setLastResupplyDate(Long lastResupplyDate) {
        this.lastResupplyDate = lastResupplyDate;
    }

    public Long getCombatEndTimestamp() {
        return combatEndTimestamp;
    }

    public void setCombatEndTimestamp(Long combatEndTimestamp) {
        this.combatEndTimestamp = combatEndTimestamp;
    }

    public GeoLocation getCombatEndLocation() {
        return combatEndLocation;
    }

    public void setCombatEndLocation(GeoLocation combatEndLocation) {
        this.combatEndLocation = combatEndLocation;
    }

    public Long getLeaveStartDate() {
        return leaveStartDate;
    }

    public void setLeaveStartDate(Long leaveStartDate) {
        this.leaveStartDate = leaveStartDate;
    }

    public Integer getLeaveDurationDays() {
        return leaveDurationDays;
    }

    public void setLeaveDurationDays(Integer leaveDurationDays) {
        this.leaveDurationDays = leaveDurationDays;
    }

    public Long getRetrainingStartDate() {
        return retrainingStartDate;
    }

    public void setRetrainingStartDate(Long retrainingStartDate) {
        this.retrainingStartDate = retrainingStartDate;
    }

    public String getRetrainingFocus() {
        return retrainingFocus;
    }

    public void setRetrainingFocus(String retrainingFocus) {
        this.retrainingFocus = retrainingFocus;
    }

    public Integer getRetrainingDurationDays() {
        return retrainingDurationDays;
    }

    public void setRetrainingDurationDays(Integer retrainingDurationDays) {
        this.retrainingDurationDays = retrainingDurationDays;
    }

    public String getCurrentMission() {
        return currentMission;
    }

    public void setCurrentMission(String currentMission) {
        this.currentMission = currentMission;
    }

    public String getUnitSituationType() {
        return unitSituationType;
    }

    public void setUnitSituationType(String unitSituationType) {
        this.unitSituationType = unitSituationType;
    }

    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public TOEInformation getToe() {
        return toe;
    }

    public void setToe(TOEInformation toe) {
        this.toe = toe;
    }

    public Double getPublicOrderIndex() {
        return publicOrderIndex;
    }

    public void setPublicOrderIndex(Double publicOrderIndex) {
        this.publicOrderIndex = publicOrderIndex;
    }

    public Integer getCriticalityLevel() {
        return criticalityLevel;
    }

    public void setCriticalityLevel(Integer criticalityLevel) {
        this.criticalityLevel = criticalityLevel;
    }

    public List<Soldier> getPersonnelList() {
        return personnelList;
    }

    public void setPersonnelList(List<Soldier> personnelList) {
        this.personnelList = personnelList;
    }

    public List<UAVAsset> getUavAssets() {
        return uavAssets;
    }

    public void setUavAssets(List<UAVAsset> uavAssets) {
        this.uavAssets = uavAssets;
    }
}
