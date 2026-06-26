package com.simcop.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.HashMap;

@Service
public class TelegramService {

    private static final Logger logger = LoggerFactory.getLogger(TelegramService.class);

    @Value("${telegram.bot.token:}")
    private String propertiesBotToken;

    private final RestTemplate restTemplate;
    private final ConfigurationService configService;
    private final com.simcop.repository.UserRepository userRepository;

    public TelegramService(ConfigurationService configService, com.simcop.repository.UserRepository userRepository) {
        this.restTemplate = new RestTemplate();
        this.configService = configService;
        this.userRepository = userRepository;
    }

    public String getBotTokenArtillery() {
        String dbToken = configService.getTelegramBotToken();
        return (dbToken != null && !dbToken.trim().isEmpty()) ? dbToken : propertiesBotToken;
    }

    public String getBotTokenComms() {
        String dbToken = configService.getTelegramBotTokenComms();
        return (dbToken != null && !dbToken.trim().isEmpty()) ? dbToken : propertiesBotToken;
    }

    // Default sendMessage uses Artillery token for backwards compatibility
    public boolean sendMessage(String chatId, String text) {
        return sendMessageWithToken(chatId, text, getBotTokenArtillery());
    }

    public boolean sendMessageWithToken(String chatId, String text, String token) {
        if (token == null || token.isEmpty()) {
            logger.warn("Telegram bot token not configured. Cannot send message to {}", chatId);
            return false;
        }

        String url = "https://api.telegram.org/bot" + token + "/sendMessage";

        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("text", text);
        body.put("parse_mode", "Markdown");

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, body, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("Telegram message sent to {}: {}", chatId, text);
                return true;
            } else {
                logger.error("Failed to send Telegram message. Status: {}, Body: {}", response.getStatusCode(),
                        response.getBody());
                return false;
            }
        } catch (Exception e) {
            logger.error("Error sending Telegram message to {}: {}", chatId, e.getMessage());
            return false;
        }
    }

    public boolean sendQ5Report(com.simcop.model.Q5Report report) {
        logger.info("Attempting to send Q5 Report via Telegram: {}", report.getId());

        StringBuilder message = new StringBuilder();
        message.append("🚨 *REPORTE Q5 RECIBIDO* 🚨\n\n");
        message.append("*Unidad:* ").append(report.getUnitName()).append("\n");
        message.append("*Fecha:* ").append(new java.util.Date(report.getReportTimestamp())).append("\n\n");
        message.append("*QUÉ:* ").append(report.getQue()).append("\n");
        message.append("*QUIÉN:* ").append(report.getQuien()).append("\n");
        message.append("*CUÁNDO:* ").append(report.getCuando()).append("\n");
        message.append("*DÓNDE:* ").append(report.getDonde()).append("\n");
        message.append("*HECHOS:* ").append(report.getHechos()).append("\n");
        message.append("*ACCIONES:* ").append(report.getAccionesSubsiguientes()).append("\n");

        logger.warn("Q5 Report formatted but not sent: No recipient configured in backend logic yet.");
        return true;
    }

    public void sendFireMissionNotification(com.simcop.model.FireMission mission) {
        logger.info("Enviando notificación de Telegram para nueva Misión de Fuego: {}", mission.getId());

        StringBuilder message = new StringBuilder();
        message.append("🔥 *NUEVA MISIÓN DE FUEGO* 🔥\n\n");
        message.append("*ID:* `").append(mission.getId().substring(0, 8)).append("...`\n");
        message.append("*Blanco:* `").append(mission.getTargetLocation().getLat()).append(", ").append(mission.getTargetLocation().getLon()).append("`\n");
        message.append("*Tipo de Proyectil:* ").append(mission.getProjectileType() != null ? mission.getProjectileType() : "No especificado").append("\n");
        message.append("*Prioridad:* ALTA\n\n");
        message.append("Abra el SIMCOP para procesar los datos balísticos.");

        String token = getBotTokenArtillery();

        userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && 
                    (u.getRole().name().startsWith("DIRECTOR_TIRO_") || u.getRole().name().equals("ADMINISTRATOR")) && 
                    u.getTelegramChatId() != null && !u.getTelegramChatId().isEmpty())
                .forEach(cdt -> {
                    logger.info("Notificando CDT/Admin: {} (ChatID: {})", cdt.getUsername(), cdt.getTelegramChatId());
                    sendMessageWithToken(cdt.getTelegramChatId(), message.toString(), token);
                });
    }

    public void broadcastTacticalAlert(String message) {
        logger.info("Enviando Alerta Táctica por Telegram");
        String token = getBotTokenComms();
        
        userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && 
                    (u.getRole().name().equals("ADMINISTRATOR") || 
                     u.getRole().name().equals("COMANDANTE_BATALLON") || 
                     u.getRole().name().equals("COMUNICACIONES")) && 
                    u.getTelegramChatId() != null && !u.getTelegramChatId().isEmpty())
                .forEach(user -> {
                    sendMessageWithToken(user.getTelegramChatId(), message, token);
                });
    }
}
