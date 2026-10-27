package com.simcop.service;

import com.simcop.model.*;
import com.simcop.repository.UserRepository;
import com.simcop.repository.ArtilleryPieceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class WhatsAppService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppService.class);
    private static final String DEFAULT_INSTANCE = "SIMCOP_CENTRAL";

    @Value("${evolution.api.url:http://evolution_api:8082}")
    private String evolutionApiUrl;

    @Value("${evolution.api.key:simcop-evolution-tactical-key-2026}")
    private String evolutionApiKey;

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final ArtilleryPieceRepository artilleryRepository;

    public WhatsAppService(UserRepository userRepository, ArtilleryPieceRepository artilleryRepository) {
        this.restTemplate = new RestTemplate();
        this.userRepository = userRepository;
        this.artilleryRepository = artilleryRepository;
    }

    private String getBaseUrl() {
        if (evolutionApiUrl == null || evolutionApiUrl.trim().isEmpty()) {
            return "http://evolution_api:8082";
        }
        return evolutionApiUrl.replaceAll("/+$", "");
    }

    private String getApiKey() {
        return (evolutionApiKey != null && !evolutionApiKey.trim().isEmpty()) ? evolutionApiKey : "simcop-evolution-tactical-key-2026";
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", getApiKey());
        return headers;
    }

    /**
     * Limpia y formatea números telefónicos internacionales.
     * Ejemplo: "3101234567" -> "573101234567"
     */
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

    /**
     * Consulta el estado de conexión de la instancia de WhatsApp.
     */
    public Map<String, Object> getInstanceStatus() {
        Map<String, Object> result = new HashMap<>();
        result.put("instanceName", DEFAULT_INSTANCE);
        result.put("status", "close");
        result.put("connected", false);

        String url = getBaseUrl() + "/instance/connectionState/" + DEFAULT_INSTANCE;
        try {
            HttpEntity<Void> entity = new HttpEntity<>(createHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map body = response.getBody();
                Object state = body.get("instance");
                if (state instanceof Map) {
                    String s = String.valueOf(((Map) state).get("state"));
                    result.put("status", s);
                    result.put("connected", "open".equalsIgnoreCase(s));
                } else if (body.containsKey("state")) {
                    String s = String.valueOf(body.get("state"));
                    result.put("status", s);
                    result.put("connected", "open".equalsIgnoreCase(s));
                }
            }
        } catch (Exception e) {
            logger.debug("Instancia aún no creada o Evolution API no disponible: {}", e.getMessage());
            result.put("status", "disconnected");
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * Garantiza la existencia de la instancia y retorna el QR o datos de conexión.
     */
    public Map<String, Object> getQrCode() {
        Map<String, Object> responseMap = new HashMap<>();
        String createUrl = getBaseUrl() + "/instance/create";
        String connectUrl = getBaseUrl() + "/instance/connect/" + DEFAULT_INSTANCE;

        try {
            // 1. Intentar crear la instancia si no existe
            Map<String, Object> createBody = new HashMap<>();
            createBody.put("instanceName", DEFAULT_INSTANCE);
            createBody.put("token", "simcop-comms-tactical-2026");
            createBody.put("qrcode", true);
            createBody.put("integration", "WHATSAPP-BAILEYS");

            HttpEntity<Map<String, Object>> createEntity = new HttpEntity<>(createBody, createHeaders());
            try {
                restTemplate.postForEntity(createUrl, createEntity, Map.class);
            } catch (Exception ignored) {
                // Si ya existe la instancia, continuará al paso connect
            }

            // 2. Obtener QR code
            HttpEntity<Void> connectEntity = new HttpEntity<>(createHeaders());
            ResponseEntity<Map> connectResponse = restTemplate.exchange(connectUrl, HttpMethod.GET, connectEntity, Map.class);
            if (connectResponse.getStatusCode().is2xxSuccessful() && connectResponse.getBody() != null) {
                Map body = connectResponse.getBody();
                responseMap.put("success", true);
                responseMap.put("instanceName", DEFAULT_INSTANCE);
                responseMap.put("qrcode", body.get("base64") != null ? body.get("base64") : body.get("qrcode"));
                responseMap.put("code", body.get("code"));
                responseMap.put("pairingCode", body.get("pairingCode"));
                return responseMap;
            }
        } catch (Exception e) {
            logger.error("Error al generar QR de Evolution API: {}", e.getMessage());
            responseMap.put("success", false);
            responseMap.put("error", e.getMessage());
        }

        return responseMap;
    }

    /**
     * Desconecta o cierra la sesión de WhatsApp.
     */
    public boolean disconnect() {
        String url = getBaseUrl() + "/instance/logout/" + DEFAULT_INSTANCE;
        try {
            HttpEntity<Void> entity = new HttpEntity<>(createHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, Map.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            logger.error("Error al desconectar WhatsApp: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Envía un mensaje de texto a un número de WhatsApp vía Evolution API.
     */
    public boolean sendTextMessage(String phoneNumber, String text) {
        String targetNumber = formatPhoneNumber(phoneNumber);
        if (targetNumber == null || targetNumber.isEmpty()) {
            logger.warn("Número telefónico inválido para envío de WhatsApp: {}", phoneNumber);
            return false;
        }

        String url = getBaseUrl() + "/message/sendText/" + DEFAULT_INSTANCE;

        Map<String, Object> body = new HashMap<>();
        body.put("number", targetNumber);
        body.put("text", text);

        Map<String, Object> options = new HashMap<>();
        options.put("delay", 1200);
        options.put("presence", "composing");
        body.put("options", options);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, createHeaders());
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                logger.info("✅ Mensaje WhatsApp despachado a {}: {}", targetNumber, text.length() > 50 ? text.substring(0, 50) + "..." : text);
                return true;
            } else {
                logger.warn("Fallo al enviar WhatsApp a {}. Status: {}, Body: {}", targetNumber, response.getStatusCode(), response.getBody());
                return false;
            }
        } catch (Exception e) {
            logger.error("Error despachando WhatsApp a {}: {}", targetNumber, e.getMessage());
            return false;
        }
    }

    // =========================================================================
    // FUNCIONES TÁCTICAS Y OPERACIONALES MILITARES
    // =========================================================================

    /**
     * Notificación de Misión de Fuego a los Directores de Tiro (CDT) y Comandantes de Pieza.
     */
    public void notifyFireMission(FireMission mission) {
        if (mission == null) return;
        logger.info("📡 Notificando Misión de Fuego {} vía WhatsApp", mission.getId());

        StringBuilder msg = new StringBuilder();
        msg.append("🎯 *[SIMCOP - ALERTA MISIÓN DE FUEGO]* 🎯\n\n");
        msg.append("*ID Misión:* `").append(mission.getId().length() > 8 ? mission.getId().substring(0, 8) : mission.getId()).append("`\n");
        if (mission.getTargetLocation() != null) {
            msg.append("*Coordenadas Blanco:* `").append(mission.getTargetLocation().getLat())
               .append(", ").append(mission.getTargetLocation().getLon()).append("`\n");
        }
        msg.append("*Munición Solicitada:* ").append(mission.getProjectileType() != null ? mission.getProjectileType() : "HE Convencional").append("\n");
        msg.append("*Prioridad:* 🔴 *MÁXIMA / INMEDIATA*\n");
        msg.append("*Estado:* PENDIENTE CÁLCULO BALÍSTICO\n\n");
        msg.append("👉 Ingrese a SIMCOP (https://simcop.site) para autorización y cálculo balístico de la pieza.");

        String text = msg.toString();

        // Notificar a usuarios con rol Director de Tiro o Comandante con teléfono configurado
        userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && 
                        (u.getRole().name().startsWith("DIRECTOR_TIRO_") || 
                         u.getRole().name().equals("ADMINISTRATOR") ||
                         u.getRole().name().equals("COMANDANTE_PIEZA_ARTILLERIA")) &&
                        u.getPhoneNumber() != null && !u.getPhoneNumber().trim().isEmpty())
                .forEach(user -> {
                    logger.info("Notificando WhatsApp a CDT {}: {}", user.getUsername(), user.getPhoneNumber());
                    sendTextMessage(user.getPhoneNumber(), text);
                });
    }

    /**
     * Notificación de Solución Balística asignada a una Pieza específica.
     */
    public void notifyPieceAssigned(FireMission mission, ArtilleryPiece piece) {
        if (mission == null || piece == null) return;

        StringBuilder msg = new StringBuilder();
        msg.append("🔥 *[SIMCOP - SOLUCIÓN DE TIRO ASIGNADA A PIEZA]* 🔥\n\n");
        msg.append("*Pieza Designada:* ").append(piece.getName()).append(" (").append(piece.getType()).append(")\n");
        msg.append("*ID Misión:* `").append(mission.getId().length() > 8 ? mission.getId().substring(0, 8) : mission.getId()).append("`\n");
        if (mission.getTargetLocation() != null) {
            msg.append("*Blanco:* `").append(mission.getTargetLocation().getLat()).append(", ").append(mission.getTargetLocation().getLon()).append("`\n");
        }
        msg.append("*Tipo Proyectil:* ").append(mission.getProjectileType()).append("\n");
        msg.append("*Carga de Proyección:* ").append(mission.getCharge()).append("\n\n");
        msg.append("⚡ *ORDEN:* APUNTAR PIEZA Y REPORTAR LISTO PARA FUEGO.");

        String text = msg.toString();

        // Notificar al comandante específico de la pieza si existe
        if (piece.getCommanderId() != null && !piece.getCommanderId().trim().isEmpty()) {
            userRepository.findById(piece.getCommanderId()).ifPresent(commander -> {
                if (commander.getPhoneNumber() != null && !commander.getPhoneNumber().trim().isEmpty()) {
                    sendTextMessage(commander.getPhoneNumber(), text);
                }
            });
        }

        // Notificar al director de tiro asignado a la pieza
        if (piece.getDirectorTiroId() != null && !piece.getDirectorTiroId().trim().isEmpty()) {
            userRepository.findById(piece.getDirectorTiroId()).ifPresent(fdo -> {
                if (fdo.getPhoneNumber() != null && !fdo.getPhoneNumber().trim().isEmpty()) {
                    sendTextMessage(fdo.getPhoneNumber(), text);
                }
            });
        }
    }

    /**
     * Transmisión de Alerta Táctica general a la Plana Mayor.
     */
    public void broadcastTacticalAlert(String title, String message, String urgency) {
        StringBuilder msg = new StringBuilder();
        msg.append("🚨 *[SIMCOP - ALERTA TÁCTICA: ").append(urgency != null ? urgency.toUpperCase() : "GENERAL").append("]* 🚨\n\n");
        if (title != null && !title.isEmpty()) {
            msg.append("*ASUNTO:* ").append(title).append("\n\n");
        }
        msg.append(message).append("\n\n");
        msg.append("⏰ *Fecha/Hora:* ").append(new java.util.Date()).append("\n");
        msg.append("🔒 _SIMCOP // Mando y Control Operacional_");

        String text = msg.toString();

        userRepository.findAll().stream()
                .filter(u -> u.getRole() != null &&
                        (u.getRole().name().equals("ADMINISTRATOR") ||
                         u.getRole().name().equals("COMANDANTE_BATALLON") ||
                         u.getRole().name().equals("COMUNICACIONES")) &&
                        u.getPhoneNumber() != null && !u.getPhoneNumber().trim().isEmpty())
                .forEach(u -> sendTextMessage(u.getPhoneNumber(), text));
    }

    /**
     * Alerta prioritaria de Ciberdefensa Activa (ACD) al Superadministrador.
     */
    public void notifyCyberAlert(Alert alert) {
        if (alert == null) return;

        StringBuilder msg = new StringBuilder();
        msg.append("🛡️ *[SIMCOP - CIBERDEFENSA ACTIVA]* 🛡️\n\n");
        msg.append("*EVENTO:* Intrusión Crítica Detectada\n");
        msg.append("*SEVERIDAD:* 🔴 CRÍTICA\n");
        msg.append("*MENSAJE:* ").append(alert.getMessage() != null ? alert.getMessage() : "Alerta de intrusión").append("\n\n");
        if (alert.getData() != null && !alert.getData().trim().isEmpty()) {
            msg.append("*DETALLES TÉCNICOS:* \n`").append(alert.getData()).append("`\n\n");
        }
        msg.append("⚠️ _Contramedida de aislamiento ejecutada automáticamente._");

        String text = msg.toString();

        userRepository.findAll().stream()
                .filter(u -> ("santiago.salazar".equalsIgnoreCase(u.getUsername()) || u.getRole() == UserRole.ADMINISTRATOR) &&
                        u.getPhoneNumber() != null && !u.getPhoneNumber().trim().isEmpty())
                .forEach(admin -> sendTextMessage(admin.getPhoneNumber(), text));
    }

    /**
     * Envío de Reporte Táctico Q5 a los Comandantes.
     */
    public void notifyQ5Report(Q5Report report) {
        if (report == null) return;

        StringBuilder msg = new StringBuilder();
        msg.append("📋 *[SIMCOP - REPORTE Q5 RECIBIDO]* 📋\n\n");
        msg.append("*Unidad:* ").append(report.getUnitName()).append("\n");
        msg.append("*QUÉ:* ").append(report.getQue()).append("\n");
        msg.append("*QUIÉN:* ").append(report.getQuien()).append("\n");
        msg.append("*DÓNDE:* ").append(report.getDonde()).append("\n");
        msg.append("*CUÁNDO:* ").append(report.getCuando()).append("\n");
        msg.append("*HECHOS:* ").append(report.getHechos()).append("\n");
        msg.append("*ACCIONES:* ").append(report.getAccionesSubsiguientes()).append("\n\n");
        msg.append("Consulte el expediente completo en https://simcop.site");

        String text = msg.toString();

        userRepository.findAll().stream()
                .filter(u -> u.getRole() != null &&
                        (u.getRole().name().equals("ADMINISTRATOR") ||
                         u.getRole().name().equals("COMANDANTE_BATALLON")) &&
                        u.getPhoneNumber() != null && !u.getPhoneNumber().trim().isEmpty())
                .forEach(u -> sendTextMessage(u.getPhoneNumber(), text));
    }

    /**
     * Notificación de Publicación de Orden de Operaciones (ORDOP / FRAGO).
     */
    public void notifyOperationsOrder(OperationsOrder ordop) {
        if (ordop == null) return;

        StringBuilder msg = new StringBuilder();
        msg.append("📜 *[SIMCOP - NUEVA ORDEN DE OPERACIONES]* 📜\n\n");
        msg.append("*ID ORDEN:* `").append(ordop.getId() != null ? (ordop.getId().length() > 8 ? ordop.getId().substring(0, 8) : ordop.getId()) : "N/A").append("`\n");
        msg.append("*TÍTULO:* ").append(ordop.getTitle() != null ? ordop.getTitle() : "Orden de Operaciones").append("\n");
        msg.append("*MISIÓN:* ").append(ordop.getMission() != null ? ordop.getMission() : "Consultar documento").append("\n\n");
        msg.append("👉 Descargue la orden completa y mapas en https://simcop.site");

        String text = msg.toString();

        userRepository.findAll().stream()
                .filter(u -> u.getPhoneNumber() != null && !u.getPhoneNumber().trim().isEmpty())
                .forEach(u -> sendTextMessage(u.getPhoneNumber(), text));
    }
}
