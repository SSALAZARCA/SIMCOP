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

        String encryptedValue = encrypt(apiKey.trim());

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

    @org.springframework.beans.factory.annotation.Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    private String masterSecretKey;

    private static final int GCM_IV_LENGTH = 12; // 96 bits
    private static final int GCM_TAG_LENGTH = 128; // 128 bits
    private static final java.security.SecureRandom secureRandom = new java.security.SecureRandom();

    private javax.crypto.SecretKey deriveAesKey() {
        try {
            String seed = System.getenv("SIMCOP_STORAGE_KEY");
            if (seed == null || seed.trim().isEmpty()) {
                seed = System.getenv("JWT_SECRET");
            }
            if (seed == null || seed.trim().isEmpty()) {
                seed = masterSecretKey;
            }
            java.security.MessageDigest sha256 = java.security.MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha256.digest(seed.getBytes(StandardCharsets.UTF_8));
            return new javax.crypto.spec.SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new RuntimeException("Error deriving AES-256-GCM storage key", e);
        }
    }

    /**
     * Real AES-256-GCM encryption with random 12-byte IV prepended to ciphertext
     */
    private String encrypt(String value) {
        if (value == null) return null;
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
            javax.crypto.spec.GCMParameterSpec spec = new javax.crypto.spec.GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, deriveAesKey(), spec);

            byte[] cipherText = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Real AES-256-GCM decryption with graceful fallback for legacy Base64 data
     */
    private String decrypt(String encryptedValue) {
        if (encryptedValue == null) return null;
        try {
            byte[] decoded = Base64.getDecoder().decode(encryptedValue);
            if (decoded.length >= GCM_IV_LENGTH + (GCM_TAG_LENGTH / 8)) {
                try {
                    byte[] iv = new byte[GCM_IV_LENGTH];
                    System.arraycopy(decoded, 0, iv, 0, GCM_IV_LENGTH);

                    byte[] cipherText = new byte[decoded.length - GCM_IV_LENGTH];
                    System.arraycopy(decoded, GCM_IV_LENGTH, cipherText, 0, cipherText.length);

                    javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
                    javax.crypto.spec.GCMParameterSpec spec = new javax.crypto.spec.GCMParameterSpec(GCM_TAG_LENGTH, iv);
                    cipher.init(javax.crypto.Cipher.DECRYPT_MODE, deriveAesKey(), spec);

                    byte[] decryptedBytes = cipher.doFinal(cipherText);
                    return new String(decryptedBytes, StandardCharsets.UTF_8);
                } catch (Exception gcmEx) {
                    // Fallback to legacy plain Base64 if not encrypted with GCM
                }
            }
            // Legacy plain Base64 fallback
            return new String(decoded, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return encryptedValue;
        }
    }
}
