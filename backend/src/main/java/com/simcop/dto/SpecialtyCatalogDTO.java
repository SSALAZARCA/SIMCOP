package com.simcop.dto;

public class SpecialtyCatalogDTO {
    private String id;
    private String code;
    private String name;
    private String category;
    private String description;

    public SpecialtyCatalogDTO() {
    }

    public SpecialtyCatalogDTO(String id, String code, String name, String category, String description) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.category = category;
        this.description = description;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
