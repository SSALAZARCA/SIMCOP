package com.simcop.service;

import dev.samstevens.totp.code.*;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import org.springframework.stereotype.Service;

@Service
public class TwoFactorService {

    private final SecretGenerator secretGenerator;
    private final CodeVerifier codeVerifier;

    public TwoFactorService() {
        this.secretGenerator = new DefaultSecretGenerator(64);
        TimeProvider timeProvider = new SystemTimeProvider();
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        DefaultCodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
        verifier.setAllowedTimePeriodDiscrepancy(3); // Permite hasta 90 segundos de desincronización
        this.codeVerifier = verifier;
    }

    public String generateNewSecret() {
        return secretGenerator.generate();
    }

    public String getQrCodeImageUri(String secret, String username) throws QrGenerationException {
        QrData data = new QrData.Builder()
                .label(username)
                .secret(secret)
                .issuer("SIMCOP")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();
                
        // Return otpauth:// uri instead of image if we want frontend to generate QR, 
        // but for now let's just use the URI itself so frontend can easily use qrcode.react
        return data.getUri();
    }

    public boolean isOtpValid(String secret, String code) {
        return codeVerifier.isValidCode(secret, code);
    }
}
