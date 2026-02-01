package com.simcop.model;

import jakarta.persistence.*;

@Entity
@Table(name = "logistics_requests")
public class LogisticsRequest {

    @Id
    private String id;

    private String originatingUnitId;
    private String originatingUnitName;

    @Column(length = 1000)
    private String details;

    private long requestTimestamp;
    private String status;
    private Long fulfilledTimestamp;
    private String fulfilledByUserId;
    private String relatedAlertId;

    public LogisticsRequest() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOriginatingUnitId() {
        return originatingUnitId;
    }

    public void setOriginatingUnitId(String originatingUnitId) {
        this.originatingUnitId = originatingUnitId;
    }

    public String getOriginatingUnitName() {
        return originatingUnitName;
    }

    public void setOriginatingUnitName(String originatingUnitName) {
        this.originatingUnitName = originatingUnitName;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public long getRequestTimestamp() {
        return requestTimestamp;
    }

    public void setRequestTimestamp(long requestTimestamp) {
        this.requestTimestamp = requestTimestamp;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getFulfilledTimestamp() {
        return fulfilledTimestamp;
    }

    public void setFulfilledTimestamp(Long fulfilledTimestamp) {
        this.fulfilledTimestamp = fulfilledTimestamp;
    }

    public String getFulfilledByUserId() {
        return fulfilledByUserId;
    }

    public void setFulfilledByUserId(String fulfilledByUserId) {
        this.fulfilledByUserId = fulfilledByUserId;
    }

    public String getRelatedAlertId() {
        return relatedAlertId;
    }

    public void setRelatedAlertId(String relatedAlertId) {
        this.relatedAlertId = relatedAlertId;
    }
}
