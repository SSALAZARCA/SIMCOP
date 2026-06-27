package com.simcop.dto;

public class TwoFactorVerifyRequest {
    private String code;

    public TwoFactorVerifyRequest() {
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
