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
    private static final String AI_PROVIDER_CONFIG = "AI_PROVIDER";
    private static final String LOCAL_AI_ENDPOINT_CONFIG = "LOCAL_AI_ENDPOINT";
    private static final String LOCAL_AI_MODEL_CONFIG = "LOCAL_AI_MODEL";
    private static final String TELEGRAM_BOT_TOKEN_CONFIG = "TELEGRAM_BOT_TOKEN";
    private static final String TELEGRAM_BOT_TOKEN_COMMS_CONFIG = "TELEGRAM_BOT_TOKEN_COMMS";

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
     * AI Provider methods
     */
    public String getAIProvider() {
        return configRepository.findByConfigKey(AI_PROVIDER_CONFIG)
                .map(AppConfiguration::getConfigValue)
                .orElse("GEMINI");
    }

    @Transactional
    public void saveAIProvider(String provider, String username) {
        saveConfigValue(AI_PROVIDER_CONFIG, provider, username, "AI Provider (GEMINI or LOCAL_OLLAMA)");
    }

    /**
     * Local AI Endpoint methods
     */
    public String getLocalAIEndpoint() {
        return configRepository.findByConfigKey(LOCAL_AI_ENDPOINT_CONFIG)
                .map(AppConfiguration::getConfigValue)
                .orElse("http://localhost:11434");
    }

    @Transactional
    public void saveLocalAIEndpoint(String endpoint, String username) {
        saveConfigValue(LOCAL_AI_ENDPOINT_CONFIG, endpoint, username, "Local AI Endpoint (e.g. http://localhost:11434)");
    }

    /**
     * Local AI Model methods
     */
    public String getLocalAIModel() {
        return configRepository.findByConfigKey(LOCAL_AI_MODEL_CONFIG)
                .map(AppConfiguration::getConfigValue)
                .orElse("llama3");
    }

    @Transactional
    public void saveLocalAIModel(String model, String username) {
        saveConfigValue(LOCAL_AI_MODEL_CONFIG, model, username, "Local AI Model name (e.g. llama3)");
    }

    /**
     * Get the Telegram Bot Token (decrypted)
     */
    public String getTelegramBotToken() {
        return configRepository.findByConfigKey(TELEGRAM_BOT_TOKEN_CONFIG)
                .map(config -> decrypt(config.getConfigValue()))
                .orElse(null);
    }

    /**
     * Save Telegram Bot Token (encrypted)
     */
    @Transactional
    public void saveTelegramBotToken(String token, String username) {
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Token cannot be empty");
        }

        AppConfiguration config = configRepository.findByConfigKey(TELEGRAM_BOT_TOKEN_CONFIG)
                .orElse(new AppConfiguration());

        config.setConfigKey(TELEGRAM_BOT_TOKEN_CONFIG);
        config.setConfigValue(encrypt(token));
        config.setUpdatedBy(username);
        config.setUpdatedAt(java.time.LocalDateTime.now());

        configRepository.save(config);
    }

    /**
     * Get the Communications Telegram Bot Token (decrypted)
     */
    public String getTelegramBotTokenComms() {
        return configRepository.findByConfigKey(TELEGRAM_BOT_TOKEN_COMMS_CONFIG)
                .map(config -> decrypt(config.getConfigValue()))
                .orElse(null);
    }

    /**
     * Save Communications Telegram Bot Token (encrypted)
     */
    @Transactional
    public void saveTelegramBotTokenComms(String token, String username) {
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Token cannot be empty");
        }

        AppConfiguration config = configRepository.findByConfigKey(TELEGRAM_BOT_TOKEN_COMMS_CONFIG)
                .orElse(new AppConfiguration());

        config.setConfigKey(TELEGRAM_BOT_TOKEN_COMMS_CONFIG);
        config.setConfigValue(encrypt(token));
        config.setUpdatedBy(username);
        config.setUpdatedAt(java.time.LocalDateTime.now());

        configRepository.save(config);
    }

    @Transactional
    private void saveConfigValue(String key, String value, String username, String description) {
        Optional<AppConfiguration> existing = configRepository.findByConfigKey(key);
        if (existing.isPresent()) {
            AppConfiguration config = existing.get();
            config.setConfigValue(value);
            config.setUpdatedBy(username);
            configRepository.save(config);
        } else {
            AppConfiguration config = new AppConfiguration(key, value, description, username);
            configRepository.save(config);
        }
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
