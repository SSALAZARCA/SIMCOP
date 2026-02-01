package com.simcop.model;

import com.simcop.model.embeddable.GeoLocation;
import jakarta.persistence.*;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "intelligence_reports")
public class IntelligenceReport {

    @Id
    private String id;

    private String title;

    @Enumerated(EnumType.STRING)
    private IntelligenceSourceType type;

    private String sourceDetails;

    @Enumerated(EnumType.STRING)
    private IntelligenceReliability reliability;

    @Enumerated(EnumType.STRING)
    private IntelligenceCredibility credibility;

    @ElementCollection
    private List<String> keywords = new ArrayList<>();

    @Embedded
    private GeoLocation location;

    private long eventTimestamp;
    private long reportTimestamp;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(name = "reporting_unit_id")
    private String reportingUnitId;

    // Attachments can be complex, skipping for now or storing as JSON string if
    // needed.
    // For simplicity, we'll omit attachments in this initial version or add a
    // placeholder.

    public IntelligenceReport() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public IntelligenceSourceType getType() {
        return type;
    }

    public void setType(IntelligenceSourceType type) {
        this.type = type;
    }

    public String getSourceDetails() {
        return sourceDetails;
    }

    public void setSourceDetails(String sourceDetails) {
        this.sourceDetails = sourceDetails;
    }

    public IntelligenceReliability getReliability() {
        return reliability;
    }

    public void setReliability(IntelligenceReliability reliability) {
        this.reliability = reliability;
    }

    public IntelligenceCredibility getCredibility() {
        return credibility;
    }

    public void setCredibility(IntelligenceCredibility credibility) {
        this.credibility = credibility;
    }

    public List<String> getKeywords() {
        return keywords;
    }

    public void setKeywords(List<String> keywords) {
        this.keywords = keywords;
    }

    public GeoLocation getLocation() {
        return location;
    }

    public void setLocation(GeoLocation location) {
        this.location = location;
    }

    public long getEventTimestamp() {
        return eventTimestamp;
    }

    public void setEventTimestamp(long eventTimestamp) {
        this.eventTimestamp = eventTimestamp;
    }

    public long getReportTimestamp() {
        return reportTimestamp;
    }

    public void setReportTimestamp(long reportTimestamp) {
        this.reportTimestamp = reportTimestamp;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getReportingUnitId() {
        return reportingUnitId;
    }

    public void setReportingUnitId(String reportingUnitId) {
        this.reportingUnitId = reportingUnitId;
    }
}
