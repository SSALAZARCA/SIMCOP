package com.simcop.controller;

import com.simcop.model.User;
import com.simcop.repository.UserRepository;
import com.simcop.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class UserController {

    @Autowired
    private UserRepository repository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping
    public List<User> getAllUsers() {
        return repository.findAll();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestHeader("Authorization") String token) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                String username = jwtUtil.extractUsername(token);
                var userOpt = repository.findByUsername(username);
                if (userOpt.isPresent()) {
                    User u = userOpt.get();
                    java.util.Map<String, Object> response = new java.util.HashMap<>();
                    response.put("id", u.getId());
                    response.put("username", u.getUsername());
                    response.put("displayName", u.getDisplayName());
                    response.put("role", u.getRole());
                    response.put("permissions", u.getPermissions());
                    response.put("assignedUnitId", u.getAssignedUnitId());
                    response.put("telegramChatId", u.getTelegramChatId());
                    response.put("token", token);
                    return ResponseEntity.ok(response);
                }
            }
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        try {
            // Encode the password before saving
            user.setHashedPassword(passwordEncoder.encode(user.getHashedPassword()));
            User savedUser = repository.save(user);
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        var userOpt = repository.findByUsername(loginRequest.getUsername());
        if (userOpt.isPresent()) {
            User u = userOpt.get();
            if (passwordEncoder.matches(loginRequest.getHashedPassword(), u.getHashedPassword())) {
                String token = jwtUtil.generateToken(u.getUsername());
                java.util.Map<String, Object> response = new java.util.HashMap<>();
                response.put("id", u.getId());
                response.put("username", u.getUsername());
                response.put("displayName", u.getDisplayName());
                response.put("role", u.getRole());
                response.put("permissions", u.getPermissions());
                response.put("assignedUnitId", u.getAssignedUnitId());
                response.put("telegramChatId", u.getTelegramChatId());
                response.put("token", token);
                return ResponseEntity.ok(response);
            }
        }
        return ResponseEntity.status(403).build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody User userDetails) {
        try {
            return repository.findById(id)
                    .map(user -> {
                        user.setDisplayName(userDetails.getDisplayName());
                        user.setRole(userDetails.getRole());
                        user.setPermissions(userDetails.getPermissions());
                        user.setAssignedUnitId(userDetails.getAssignedUnitId());
                        // Password update logic could go here if needed
                        User updatedUser = repository.save(user);
                        return ResponseEntity.ok(updatedUser);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error updating user: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
