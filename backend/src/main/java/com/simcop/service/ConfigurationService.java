package com.simcop.service;

import com.simcop.model.AppConfiguration;
import com.simcop.repository.AppConfigurationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

@Service
public class ConfigurationService {

    private static final String GEMINI_API_KEY_CONFIG = "GEMINI_API_KEY";

    @Autowired
    private AppConfigurationRepository configRepository;

    /**
     * Get the Gemini API key (decrypted)
     */
    public Optional<String> getGeminiApiKey() {
        return configRepository.findByConfigKey(GEMINI_API_KEY_CONFIG)
                .map(config -> decrypt(config.getConfigValue()));
    }

    /**
     * Check if Gemini API key exists
     */
    public boolean hasGeminiApiKey() {
        return configRepository.existsByConfigKey(GEMINI_API_KEY_CONFIG);
    }

    /**
     * Save Gemini API key (encrypted)
     */
    @Transactional
    public void saveGeminiApiKey(String apiKey, String username) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("API key cannot be empty");
        }

        // Validate API key format
        if (!apiKey.startsWith("AIza")) {
            throw new IllegalArgumentException("Invalid Gemini API key format. Must start with 'AIza'");
        }

        String encryptedValue = encrypt(apiKey);

        Optional<AppConfiguration> existing = configRepository.findByConfigKey(GEMINI_API_KEY_CONFIG);

        if (existing.isPresent()) {
            // Update existing
            AppConfiguration config = existing.get();
            config.setConfigValue(encryptedValue);
            config.setUpdatedBy(username);
            configRepository.save(config);
        } else {
            // Create new
            AppConfiguration config = new AppConfiguration(
                    GEMINI_API_KEY_CONFIG,
                    encryptedValue,
                    "Google Gemini API Key for AI features",
                    username);
            configRepository.save(config);
        }
    }

    /**
     * Delete Gemini API key
     */
    @Transactional
    public void deleteGeminiApiKey() {
        configRepository.findByConfigKey(GEMINI_API_KEY_CONFIG)
                .ifPresent(config -> configRepository.delete(config));
    }

    /**
     * Simple Base64 encryption (for basic obfuscation)
     * For production, consider using AES-256 or similar
     */
    private String encrypt(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Simple Base64 decryption
     */
    private String decrypt(String encryptedValue) {
        byte[] decodedBytes = Base64.getDecoder().decode(encryptedValue);
        return new String(decodedBytes, StandardCharsets.UTF_8);
    }
}
