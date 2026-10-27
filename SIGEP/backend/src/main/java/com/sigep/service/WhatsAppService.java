package com.sigep.service;

import com.sigep.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class WhatsAppService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppService.class);
    private static final String DEFAULT_INSTANCE = "SIMCOP_CENTRAL";

    @Value("${evolution.api.url:http://evolution_api:8082}")
    private String evolutionApiUrl;

    @Value("${evolution.api.key:simcop-evolution-tactical-key-2026}")
    private String evolutionApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private String getBaseUrl() {
        return (evolutionApiUrl != null && !evolutionApiUrl.trim().isEmpty())
                ? evolutionApiUrl.replaceAll("/+$", "")
                : "http://evolution_api:8082";
    }

    private String getApiKey() {
        return (evolutionApiKey != null && !evolutionApiKey.trim().isEmpty())
                ? evolutionApiKey
                : "simcop-evolution-tactical-key-2026";
    }

    public String formatPhoneNumber(String rawNumber) {
        if (rawNumber == null) return null;
        String digits = rawNumber.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return null;
        if (digits.length() == 10 && digits.startsWith("3")) {
            return "57" + digits;
        }
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        }
        return digits;
    }

    public boolean sendTextMessage(String phoneNumber, String text) {
        String targetNumber = formatPhoneNumber(phoneNumber);
        if (targetNumber == null || targetNumber.isEmpty()) {
            return false;
        }

        String url = getBaseUrl() + "/message/sendText/" + DEFAULT_INSTANCE;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", getApiKey());

        Map<String, Object> body = new HashMap<>();
        body.put("number", targetNumber);
        body.put("text", text);

        Map<String, Object> options = new HashMap<>();
        options.put("delay", 1000);
        options.put("presence", "composing");
        body.put("options", options);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            logger.warn("SIGEP no pudo enviar WhatsApp a {}: {}", targetNumber, e.getMessage());
            return false;
        }
    }

    public void sendUserCredentials(User user, String rawPassword) {
        if (user == null || user.getPhoneNumber() == null || user.getPhoneNumber().trim().isEmpty()) {
            return;
        }

        String platformName = "SIMCOP (Sistema de Mando y Control)";
        String platformUrl = "https://simcop.site";
        String roleStr = user.getRole() != null ? user.getRole().toUpperCase() : "";

        if (roleStr.contains("LOGISTICA") || roleStr.contains("SILOG") || roleStr.contains("ALMACEN") || roleStr.contains("ARMAMENTO")) {
            platformName = "SILOGA (Sistema de Logística y Armamento)";
            platformUrl = "https://siloga.site";
        } else if (roleStr.contains("PERSONAL") || roleStr.contains("SIGEP") || roleStr.contains("TALENTO")) {
            platformName = "SIGEP (Gestión de Personal y Talento Humano)";
            platformUrl = "https://sigep.site";
        }

        StringBuilder msg = new StringBuilder();
        msg.append("🎖️ *[FUERZAS MILITARES - GESTIÓN DE PERSONAL]* 🎖️\n\n");
        msg.append("Estimado(a) *").append(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername()).append("*:\n\n");
        msg.append("Se le ha asignado una cuenta activa para la plataforma *").append(platformName).append("*.\n\n");
        msg.append("🔑 *Usuario:* `").append(user.getUsername()).append("`\n");
        if (rawPassword != null && !rawPassword.isEmpty()) {
            msg.append("🔒 *Contraseña Temporal:* `").append(rawPassword).append("`\n");
        }
        msg.append("🌐 *Enlace de Ingreso:* ").append(platformUrl).append("\n\n");
        msg.append("⚠️ _Por seguridad operacional militar, active su firma digital / autenticador (Google Authenticator) en su primer ingreso._");

        sendTextMessage(user.getPhoneNumber(), msg.toString());
    }
}
