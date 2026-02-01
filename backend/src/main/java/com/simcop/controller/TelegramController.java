package com.simcop.controller;

import com.simcop.repository.UserRepository;
import com.simcop.service.TelegramService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
@CrossOrigin(origins = "*")
public class TelegramController {

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
                    return ResponseEntity.ok().body("Telegram Chat ID updated successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/test")
    public ResponseEntity<?> sendTestMessage(@RequestBody Map<String, String> payload) {
        String chatId = payload.get("chatId");
        if (chatId == null || chatId.isEmpty()) {
            return ResponseEntity.badRequest().body("Chat ID is required");
        }

        boolean sent = telegramService.sendMessage(chatId, "⚠️ SIMCOP: This is a TEST notification.");
        if (sent) {
            return ResponseEntity.ok().body("Test message sent");
        } else {
            return ResponseEntity.status(500).body("Failed to send message. Check server logs and Bot Token.");
        }
    }
}
