package com.simcop.controller;

import com.simcop.repository.UserRepository;
import com.simcop.service.TelegramService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
@Transactional
public class TelegramController {

    private static final Logger logger = LoggerFactory.getLogger(TelegramController.class);

    @Autowired
    private TelegramService telegramService;

    @Autowired
    private UserRepository userRepository;

    @PutMapping("/config/{userId}")
    public ResponseEntity<?> updateTelegramConfig(@PathVariable String userId,
            @RequestBody Map<String, String> payload) {
        String chatId = payload.get("chatId");
        if (chatId == null || chatId.isEmpty()) {
            return ResponseEntity.badRequest().body("Chat ID is required");
        }

        return userRepository.findById(userId)
                .map(user -> {
                    user.setTelegramChatId(chatId);
                    userRepository.save(user);
                    logger.info("✅ Configuración de Telegram actualizada para usuario: {}", userId);
                    return ResponseEntity.ok().body("Telegram Chat ID updated successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/test")
    public ResponseEntity<?> sendTestMessage(@RequestBody Map<String, String> payload) {
        String chatId = payload.get("chatId");
        String botType = payload.getOrDefault("botType", "ARTILLERY");
        
        if (chatId == null || chatId.isEmpty()) {
            return ResponseEntity.badRequest().body("Chat ID is required");
        }

        boolean success;
        if ("COMMS".equalsIgnoreCase(botType)) {
            success = telegramService.sendMessageWithToken(chatId, "🔔 SIMCOP Comunicaciones: Este es un mensaje de prueba.", telegramService.getBotTokenComms());
        } else {
            success = telegramService.sendMessage(chatId, "🎯 SIMCOP Artillería: Este es un mensaje de prueba.");
        }

        if (success) {
            return ResponseEntity.ok().body("Test message sent");
        } else {
            return ResponseEntity.status(500).body("Failed to send message. Check server logs and Bot Token.");
        }
    }

    @PostMapping("/tactical-alert")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_BATALLON', 'COMUNICACIONES')")
    public ResponseEntity<?> broadcastTacticalAlert(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        if (message == null || message.isEmpty()) {
            return ResponseEntity.badRequest().body("Message is required");
        }

        telegramService.broadcastTacticalAlert(message);
        return ResponseEntity.ok().body("Tactical alert broadcasted");
    }
}
