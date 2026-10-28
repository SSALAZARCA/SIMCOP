package com.simcop.controller;

import com.simcop.repository.UserRepository;
import com.simcop.service.WhatsAppService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/whatsapp")
@Transactional
public class WhatsAppController {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppController.class);

    @Autowired
    private WhatsAppService whatsAppService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Consulta el estado de la conexión de WhatsApp (open, close, connecting).
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(whatsAppService.getInstanceStatus());
    }

    /**
     * Genera o retorna el Código QR en Base64 para vincular la sesión.
     */
    @GetMapping("/qr")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMUNICACIONES', 'COMANDANTE_BATALLON', 'OFICIAL_S3', 'OFICIAL_S4') or hasAuthority('ROLE_ADMINISTRATOR') or isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getQrCode() {
        Map<String, Object> qrData = whatsAppService.getQrCode();
        return ResponseEntity.ok(qrData);
    }

    /**
     * Reinicia y purga la instancia en Evolution API, regenerando un QR limpio.
     */
    @PostMapping("/reset")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMUNICACIONES', 'COMANDANTE_BATALLON', 'OFICIAL_S3', 'OFICIAL_S4') or hasAuthority('ROLE_ADMINISTRATOR') or isAuthenticated()")
    public ResponseEntity<Map<String, Object>> resetInstance() {
        Map<String, Object> qrData = whatsAppService.resetAndGetQr();
        return ResponseEntity.ok(qrData);
    }

    /**
     * Diagnóstico técnico detallado de enlace con Evolution API para telemetría operacional.
     */
    @GetMapping("/diagnose")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMUNICACIONES', 'COMANDANTE_BATALLON', 'OFICIAL_S3', 'OFICIAL_S4') or hasAuthority('ROLE_ADMINISTRATOR') or isAuthenticated()")
    public ResponseEntity<Map<String, Object>> diagnose() {
        Map<String, Object> report = whatsAppService.diagnose();
        return ResponseEntity.ok(report);
    }

    /**
     * Desconecta o cierra la sesión de WhatsApp de la instancia.
     */
    @PostMapping("/disconnect")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMUNICACIONES', 'COMANDANTE_BATALLON', 'OFICIAL_S3', 'OFICIAL_S4') or hasAuthority('ROLE_ADMINISTRATOR') or isAuthenticated()")
    public ResponseEntity<?> disconnect() {
        boolean success = whatsAppService.disconnect();
        if (success) {
            return ResponseEntity.ok(Map.of("message", "WhatsApp desconectado correctamente"));
        } else {
            return ResponseEntity.status(500).body(Map.of("error", "No se pudo desconectar la sesión"));
        }
    }

    /**
     * Envía un mensaje de prueba a un número especificado.
     */
    @PostMapping("/test")
    public ResponseEntity<?> sendTest(@RequestBody Map<String, String> payload) {
        String phoneNumber = payload.get("phoneNumber");
        String message = payload.getOrDefault("message", "🔔 [SIMCOP TÁCTICO] Mensaje de prueba operacional desde Evolution API.");

        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El número de teléfono es obligatorio"));
        }

        boolean sent = whatsAppService.sendTextMessage(phoneNumber, message);
        if (sent) {
            return ResponseEntity.ok(Map.of("message", "Mensaje de prueba enviado exitosamente", "phoneNumber", phoneNumber));
        } else {
            return ResponseEntity.status(500).body(Map.of("error", "Fallo al enviar el mensaje. Verifique si la instancia de WhatsApp está vinculada y en línea."));
        }
    }

    /**
     * Actualiza el número de WhatsApp asociado a un usuario/CDT.
     */
    @PutMapping("/config/{userId}")
    public ResponseEntity<?> updatePhoneNumber(@PathVariable String userId, @RequestBody Map<String, String> payload) {
        String phoneNumber = payload.get("phoneNumber");

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = (auth != null) ? auth.getName() : null;

        return userRepository.findById(userId)
                .map(user -> {
                    boolean isAdmin = auth != null && auth.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATOR") || a.getAuthority().equals("ADMINISTRATOR"));

                    if (!isAdmin && (currentUsername == null || !currentUsername.equals(user.getUsername()))) {
                        logger.warn("❌ Intento no autorizado de modificar número WhatsApp de {} por {}", userId, currentUsername);
                        return ResponseEntity.status(403).body(Map.of("error", "Acceso denegado"));
                    }

                    user.setPhoneNumber(phoneNumber != null ? phoneNumber.trim() : null);
                    userRepository.save(user);
                    logger.info("✅ Número WhatsApp actualizado para usuario {}: {}", userId, phoneNumber);
                    return ResponseEntity.ok(Map.of("message", "Número de WhatsApp actualizado correctamente", "phoneNumber", user.getPhoneNumber()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Difusión de alerta táctica general a comandantes vía WhatsApp.
     */
    @PostMapping("/tactical-alert")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_BATALLON', 'COMUNICACIONES')")
    public ResponseEntity<?> broadcastTacticalAlert(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        String title = payload.get("title");
        String urgency = payload.getOrDefault("urgency", "ALTA");

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El cuerpo del mensaje es requerido"));
        }

        whatsAppService.broadcastTacticalAlert(title, message, urgency);
        return ResponseEntity.ok(Map.of("message", "Alerta táctica despachada a comandantes vía WhatsApp"));
    }
}
