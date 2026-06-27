package com.simcop.dto;

public class TwoFactorSetupResponse {
    private String qrCodeUri;
    private String manualSecret;

    public TwoFactorSetupResponse() {
    }

    public TwoFactorSetupResponse(String qrCodeUri, String manualSecret) {
        this.qrCodeUri = qrCodeUri;
        this.manualSecret = manualSecret;
    }

    public String getQrCodeUri() {
        return qrCodeUri;
    }

    public void setQrCodeUri(String qrCodeUri) {
        this.qrCodeUri = qrCodeUri;
    }

    public String getManualSecret() {
        return manualSecret;
    }

    public void setManualSecret(String manualSecret) {
        this.manualSecret = manualSecret;
    }
}
