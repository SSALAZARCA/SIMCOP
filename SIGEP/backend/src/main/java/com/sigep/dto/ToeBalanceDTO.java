package com.sigep.dto;

import lombok.Data;

@Data
public class ToeBalanceDTO {
    private String unitId;
    private String mosCode;
    private int required;
    private int actual;
    private int deficit;
    
    public ToeBalanceDTO(String unitId, String mosCode, int required, int actual) {
        this.unitId = unitId;
        this.mosCode = mosCode;
        this.required = required;
        this.actual = actual;
        this.deficit = required - actual;
    }
}
