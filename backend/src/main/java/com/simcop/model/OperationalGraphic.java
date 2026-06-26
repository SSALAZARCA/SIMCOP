package com.simcop.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "operational_graphics")
public class OperationalGraphic {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // Matches PlantillaType in frontend (e.g., "SITUACION_ACTUAL",
    // "MANIOBRA_PROPUESTA")
    @Column(nullable = false)
    private String plantillaType;

    // Matches PICCElementType (e.g., "FRIENDLY_UNIT_POINT_SIT", "LINE_OF_CONTACT")
    @Column(nullable = false)
    private String graphicType;

    // GeoJSON content as string
    @Lob
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String geoJson;

    // Optional user-editable label
    private String label;

    // Metadata
    private String createdByUserId;

    @Column(nullable = false)
    private LocalDateTime createdTimestamp;

    private LocalDateTime hiddenTimestamp; // Soft delete or hide

    public OperationalGraphic() {
    }

    public OperationalGraphic(String id, String plantillaType, String graphicType, String geoJson, String label,
            String createdByUserId, LocalDateTime createdTimestamp, LocalDateTime hiddenTimestamp) {
        this.id = id;
        this.plantillaType = plantillaType;
        this.graphicType = graphicType;
        this.geoJson = geoJson;
        this.label = label;
        this.createdByUserId = createdByUserId;
        this.createdTimestamp = createdTimestamp;
        this.hiddenTimestamp = hiddenTimestamp;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPlantillaType() {
        return plantillaType;
    }

    public void setPlantillaType(String plantillaType) {
        this.plantillaType = plantillaType;
    }

    public String getGraphicType() {
        return graphicType;
    }

    public void setGraphicType(String graphicType) {
        this.graphicType = graphicType;
    }

    public String getGeoJson() {
        return geoJson;
    }

    public void setGeoJson(String geoJson) {
        this.geoJson = geoJson;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(String createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public LocalDateTime getCreatedTimestamp() {
        return createdTimestamp;
    }

    public void setCreatedTimestamp(LocalDateTime createdTimestamp) {
        this.createdTimestamp = createdTimestamp;
    }

    public LocalDateTime getHiddenTimestamp() {
        return hiddenTimestamp;
    }

    public void setHiddenTimestamp(LocalDateTime hiddenTimestamp) {
        this.hiddenTimestamp = hiddenTimestamp;
    }
}
