package com.simcop.controller;

import com.simcop.dto.TwoFactorSetupResponse;
import com.simcop.dto.TwoFactorVerifyRequest;
import com.simcop.model.User;
import com.simcop.repository.UserRepository;
import com.simcop.service.TwoFactorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/2fa")
public class TwoFactorController {

    @Autowired
    private TwoFactorService twoFactorService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/generate")
    public ResponseEntity<TwoFactorSetupResponse> generateTwoFactorSecret(Authentication authentication) throws Exception {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String secret = twoFactorService.generateNewSecret();
        user.setTwoFactorSecret(secret);
        userRepository.save(user);

        String qrUri = twoFactorService.getQrCodeImageUri(secret, user.getUsername());
        return ResponseEntity.ok(new TwoFactorSetupResponse(qrUri, secret));
    }

    @PostMapping("/enable")
    public ResponseEntity<String> enableTwoFactor(Authentication authentication, @RequestBody TwoFactorVerifyRequest request) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getTwoFactorSecret() == null) {
            return ResponseEntity.badRequest().body("2FA secret not generated yet");
        }

        boolean isValid = twoFactorService.isOtpValid(user.getTwoFactorSecret(), request.getCode());
        if (isValid) {
            user.setTwoFactorEnabled(true);
            userRepository.save(user);
            return ResponseEntity.ok("2FA enabled successfully");
        }

        return ResponseEntity.badRequest().body("Invalid 2FA code");
    }

    @PostMapping("/disable")
    public ResponseEntity<String> disableTwoFactor(Authentication authentication, @RequestBody TwoFactorVerifyRequest request) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isValid = twoFactorService.isOtpValid(user.getTwoFactorSecret(), request.getCode());
        if (isValid) {
            user.setTwoFactorEnabled(false);
            user.setTwoFactorSecret(null);
            userRepository.save(user);
            return ResponseEntity.ok("2FA disabled successfully");
        }

        return ResponseEntity.badRequest().body("Invalid 2FA code");
    }
}
