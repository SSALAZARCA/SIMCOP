package com.simcop.dto;

public class AdminTableActionRequest {
    private String totpCode;

    public AdminTableActionRequest() {
    }

    public String getTotpCode() {
        return totpCode;
    }

    public void setTotpCode(String totpCode) {
        this.totpCode = totpCode;
    }
}
