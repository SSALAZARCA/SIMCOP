package com.simcop.service;

import com.simcop.model.*;
import com.simcop.repository.UserRepository;
import com.simcop.repository.ArtilleryPieceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
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
    private volatile String cachedActiveUrl = null;

    public WhatsAppService(UserRepository userRepository, ArtilleryPieceRepository artilleryRepository) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(12000);
        this.restTemplate = new RestTemplate(factory);
        this.userRepository = userRepository;
        this.artilleryRepository = artilleryRepository;
    }

    private List<String> getCandidateBaseUrls() {
        List<String> urls = new ArrayList<>();
        if (cachedActiveUrl != null) {
            urls.add(cachedActiveUrl);
        }

        String primary = (evolutionApiUrl != null && !evolutionApiUrl.trim().isEmpty())
                ? evolutionApiUrl.replaceAll("/+$", "")
                : "http://evolution_api:8082";

        if (!urls.contains(primary)) {
            urls.add(primary);
        }

        // Si la URL primaria tiene 8082, añadir 8080 como fallback (y viceversa)
        if (primary.contains(":8082")) {
            String alt = primary.replace(":8082", ":8080");
            if (!urls.contains(alt)) urls.add(alt);
        } else if (primary.contains(":8080")) {
            String alt = primary.replace(":8080", ":8082");
            if (!urls.contains(alt)) urls.add(alt);
        }

        // Fallbacks locales para entornos de desarrollo / test
        if (!urls.contains("http://localhost:8082")) urls.add("http://localhost:8082");
        if (!urls.contains("http://localhost:8080")) urls.add("http://localhost:8080");

        return urls;
    }

    private String getBaseUrl() {
        return cachedActiveUrl != null ? cachedActiveUrl : getCandidateBaseUrls().get(0);
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
     * Consulta el estado de conexión de la instancia de WhatsApp probando URLs candidatas.
     */
    public Map<String, Object> getInstanceStatus() {
        Map<String, Object> result = new HashMap<>();
        result.put("instanceName", DEFAULT_INSTANCE);
        result.put("status", "close");
        result.put("connected", false);

        for (String baseUrl : getCandidateBaseUrls()) {
            String url = baseUrl + "/instance/connectionState/" + DEFAULT_INSTANCE;
            try {
                HttpEntity<Void> entity = new HttpEntity<>(createHeaders());
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    cachedActiveUrl = baseUrl;
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
                    return result;
                }
            } catch (Exception e) {
                logger.debug("Evolution API no respondió en {}: {}", baseUrl, e.getMessage());
            }
        }

        result.put("status", "disconnected");
        result.put("error", "Evolution API no disponible temporalmente en la red interna.");
        return result;
    }

    /**
     * Elimina la instancia de Evolution API para liberar sesiones corruptas o atascadas.
     */
    public boolean deleteInstance() {
        boolean anySuccess = false;
        for (String baseUrl : getCandidateBaseUrls()) {
            if (deleteInstance(baseUrl)) {
                anySuccess = true;
            }
        }
        return anySuccess;
    }

    private boolean deleteInstance(String baseUrl) {
        String deleteUrl = baseUrl + "/instance/delete/" + DEFAULT_INSTANCE;
        try {
            HttpEntity<Void> entity = new HttpEntity<>(createHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(deleteUrl, HttpMethod.DELETE, entity, Map.class);
            logger.info("Instancia {} eliminada limpiamente en {}: status {}", DEFAULT_INSTANCE, baseUrl, response.getStatusCode());
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            logger.debug("Delete instancia en {} retornó: {}", baseUrl, e.getMessage());
            return false;
        }
    }

    /**
     * Fuerza la recreación limpia de la instancia y retorna inmediatamente el QR nuevo.
     */
    public Map<String, Object> resetAndGetQr() {
        logger.info("🔄 Forzando reinicio y recreación limpia de la instancia WhatsApp {}", DEFAULT_INSTANCE);
        deleteInstance();
        try {
            Thread.sleep(1200);
        } catch (InterruptedException ignored) {}
        return getQrCode();
    }

    /**
     * Garantiza la existencia de la instancia y retorna el QR o datos de conexión.
     */
    public Map<String, Object> getQrCode() {
        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("instanceName", DEFAULT_INSTANCE);

        for (String baseUrl : getCandidateBaseUrls()) {
            String createUrl = baseUrl + "/instance/create";
            String connectUrl = baseUrl + "/instance/connect/" + DEFAULT_INSTANCE;
            String stateUrl = baseUrl + "/instance/connectionState/" + DEFAULT_INSTANCE;

            try {
                // 0. Verificar si la sesión ya está abierta y activa
                try {
                    HttpEntity<Void> stateEntity = new HttpEntity<>(createHeaders());
                    ResponseEntity<Map> stateResp = restTemplate.exchange(stateUrl, HttpMethod.GET, stateEntity, Map.class);
                    if (stateResp.getStatusCode().is2xxSuccessful() && stateResp.getBody() != null) {
                        cachedActiveUrl = baseUrl;
                        String s = extractState(stateResp.getBody());
                        if ("open".equalsIgnoreCase(s)) {
                            logger.info("Instancia {} ya se encuentra conectada (state: open)", DEFAULT_INSTANCE);
                            responseMap.put("success", true);
                            responseMap.put("connected", true);
                            responseMap.put("status", "open");
                            responseMap.put("message", "La sesión de WhatsApp ya se encuentra vinculada y activa.");
                            return responseMap;
                        }
                    }
                } catch (Exception ignored) {
                    // Si no responde o da 404, procedemos al create/connect
                }

                // 1. Intentar crear la instancia (Evolution API v2)
                Map<String, Object> createBody = new HashMap<>();
                createBody.put("instanceName", DEFAULT_INSTANCE);
                createBody.put("token", "simcop-comms-tactical-2026");
                createBody.put("qrcode", true);
                createBody.put("integration", "WHATSAPP-BAILEYS");
                createBody.put("rejectCall", false);
                createBody.put("alwaysOnline", true);

                HttpEntity<Map<String, Object>> createEntity = new HttpEntity<>(createBody, createHeaders());
                try {
                    ResponseEntity<Map> createResp = restTemplate.postForEntity(createUrl, createEntity, Map.class);
                    if (createResp.getStatusCode().is2xxSuccessful() && createResp.getBody() != null) {
                        cachedActiveUrl = baseUrl;
                        Map body = createResp.getBody();
                        logger.info("Instancia {} creada en Evolution API en {}. Payload: {}", DEFAULT_INSTANCE, baseUrl, body);
                        String qr = extractQr(body);
                        String code = extractString(body, "code");
                        String pairing = extractString(body, "pairingCode");
                        if (qr != null || code != null) {
                            responseMap.put("success", true);
                            responseMap.put("qrcode", qr);
                            responseMap.put("code", code);
                            responseMap.put("pairingCode", pairing);
                            return responseMap;
                        }
                    }
                } catch (Exception e) {
                    logger.debug("Create retornó: {} (probablemente la instancia ya existe)", e.getMessage());
                }

                // 2. Loop de polling con reintentos para conectar y obtener el QR de Baileys
                // Baileys inicializa el handshake asíncronamente y emite el QR entre 1 y 3 segundos
                HttpEntity<Void> connectEntity = new HttpEntity<>(createHeaders());
                boolean triedAutoRecreate = false;

                for (int attempt = 1; attempt <= 5; attempt++) {
                    try {
                        ResponseEntity<Map> connectResponse = restTemplate.exchange(connectUrl, HttpMethod.GET, connectEntity, Map.class);
                        if (connectResponse.getStatusCode().is2xxSuccessful() && connectResponse.getBody() != null) {
                            cachedActiveUrl = baseUrl;
                            Map body = connectResponse.getBody();
                            logger.info("Respuesta de connect en {} (intento {}): {}", baseUrl, attempt, body);

                            String state = extractState(body);
                            if ("open".equalsIgnoreCase(state)) {
                                responseMap.put("success", true);
                                responseMap.put("connected", true);
                                responseMap.put("status", "open");
                                return responseMap;
                            }

                            String qr = extractQr(body);
                            String code = extractString(body, "code");
                            String pairing = extractString(body, "pairingCode");

                            if (qr != null || code != null) {
                                responseMap.put("success", true);
                                responseMap.put("qrcode", qr);
                                responseMap.put("code", code);
                                responseMap.put("pairingCode", pairing);
                                return responseMap;
                            }
                        }
                    } catch (Exception ex) {
                        logger.warn("Intento {} en connect ({}) falló: {}", attempt, connectUrl, ex.getMessage());
                    }

                    // Auto-recuperación: si en el intento 3 no hay QR ni conexión, purgar y recrear limpia
                    if (attempt == 3 && !triedAutoRecreate) {
                        logger.warn("Instancia {} no emitió QR tras 3 intentos. Purgando y recreando en limpio...", DEFAULT_INSTANCE);
                        deleteInstance(baseUrl);
                        try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                        try {
                            restTemplate.postForEntity(createUrl, createEntity, Map.class);
                            logger.info("Instancia {} recreada tras purga automática", DEFAULT_INSTANCE);
                        } catch (Exception ignored) {}
                        triedAutoRecreate = true;
                    }

                    if (attempt < 5) {
                        try {
                            Thread.sleep(1800);
                        } catch (InterruptedException ignored) {}
                    }
                }
            } catch (Exception e) {
                logger.warn("Intento de conexión a {} falló: {}", baseUrl, e.getMessage());
            }
        }

        responseMap.put("success", false);
        responseMap.put("error", "Evolution API está inicializando el canal de WhatsApp. Presione 'Recrear Instancia Limpia' para forzar la emisión del código.");
        return responseMap;
    }

    private String extractState(Map<?, ?> body) {
        if (body == null) return null;
        Object inst = body.get("instance");
        if (inst instanceof Map) {
            Object s = ((Map<?, ?>) inst).get("state");
            if (s != null) return String.valueOf(s);
        }
        Object state = body.get("state");
        if (state != null) return String.valueOf(state);
        Object status = body.get("status");
        if (status != null) return String.valueOf(status);
        return null;
    }

    private String extractQr(Object data) {
        if (data == null) return null;
        if (data instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) data;
            for (String key : new String[]{"base64", "qrcode", "qr", "Qrcode", "qrCode"}) {
                Object val = map.get(key);
                if (val instanceof String && !((String) val).trim().isEmpty()) {
                    String str = (String) val;
                    if (str.startsWith("data:image") || str.length() > 80) {
                        return str;
                    }
                }
            }
            for (String subKey : new String[]{"qrcode", "data", "instance"}) {
                Object sub = map.get(subKey);
                if (sub instanceof Map) {
                    String res = extractQr(sub);
                    if (res != null) return res;
                }
            }
        } else if (data instanceof String) {
            String str = (String) data;
            if (str.startsWith("data:image") || str.length() > 80) {
                return str;
            }
        }
        return null;
    }

    private String extractString(Object data, String key) {
        if (data == null) return null;
        if (data instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) data;
            if (map.containsKey(key) && map.get(key) != null) {
                String val = String.valueOf(map.get(key)).trim();
                if (!val.isEmpty() && !"null".equalsIgnoreCase(val)) {
                    return val;
                }
            }
            String capitalized = Character.toUpperCase(key.charAt(0)) + key.substring(1);
            if (map.containsKey(capitalized) && map.get(capitalized) != null) {
                String val = String.valueOf(map.get(capitalized)).trim();
                if (!val.isEmpty() && !"null".equalsIgnoreCase(val)) {
                    return val;
                }
            }
            for (String subKey : new String[]{"qrcode", "data", "instance"}) {
                Object sub = map.get(subKey);
                if (sub instanceof Map) {
                    String res = extractString(sub, key);
                    if (res != null) return res;
                }
            }
        }
        return null;
    }

    /**
     * Desconecta o cierra la sesión de WhatsApp.
     */
    public boolean disconnect() {
        for (String baseUrl : getCandidateBaseUrls()) {
            String url = baseUrl + "/instance/logout/" + DEFAULT_INSTANCE;
            try {
                HttpEntity<Void> entity = new HttpEntity<>(createHeaders());
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, Map.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    return true;
                }
            } catch (Exception e) {
                logger.debug("Error logout en {}: {}", baseUrl, e.getMessage());
            }
        }
        return false;
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

        Map<String, Object> body = new HashMap<>();
        body.put("number", targetNumber);
        body.put("text", text);

        Map<String, Object> options = new HashMap<>();
        options.put("delay", 1200);
        options.put("presence", "composing");
        body.put("options", options);

        for (String baseUrl : getCandidateBaseUrls()) {
            String url = baseUrl + "/message/sendText/" + DEFAULT_INSTANCE;
            try {
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, createHeaders());
                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    cachedActiveUrl = baseUrl;
                    logger.info("✅ Mensaje WhatsApp despachado a {}: {}", targetNumber, text.length() > 50 ? text.substring(0, 50) + "..." : text);
                    return true;
                }
            } catch (Exception e) {
                logger.warn("Error enviando WhatsApp vía {}: {}", baseUrl, e.getMessage());
            }
        }

        return false;
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
