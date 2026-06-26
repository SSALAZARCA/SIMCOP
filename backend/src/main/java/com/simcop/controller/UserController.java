package com.simcop.controller;

import com.simcop.model.User;
import com.simcop.repository.UserRepository;
import com.simcop.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@Transactional
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserRepository repository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR') or hasRole('EJERCITO') or hasAnyRole('COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION', 'COMANDANTE_BRIGADA', 'COMANDANTE_BATALLON', 'COMANDANTE_COMPANIA')")
    public List<User> getAllUsers() {
        return repository.findAll();
    }

    @GetMapping("/me")
    public ResponseEntity<User> getMe(@RequestHeader("Authorization") String token) {
        try {
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                String username = jwtUtil.extractUsername(token);
                var userOpt = repository.findByUsername(username);
                if (userOpt.isPresent()) {
                    User u = userOpt.get();
                    u.setToken(token);
                    return ResponseEntity.ok(u);
                }
            }
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR') or hasRole('EJERCITO') or hasAnyRole('COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION', 'COMANDANTE_BRIGADA', 'COMANDANTE_BATALLON', 'COMANDANTE_COMPANIA')")
    public ResponseEntity<User> createUser(@RequestBody User user) {
        logger.info("👤 Iniciando creación de usuario: {}", user.getUsername());
        try {
            // Encode the password before saving
            user.setHashedPassword(passwordEncoder.encode(user.getHashedPassword()));
            User savedUser = repository.save(user);
            logger.info("✅ Usuario {} guardado exitosamente.", savedUser.getUsername());
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            logger.error("❌ Error al crear usuario {}: {}", user.getUsername(), e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestBody User loginRequest) {
        logger.info("🔑 Intento de login para usuario: {}", loginRequest.getUsername());
        var userOpt = repository.findByUsername(loginRequest.getUsername());
        if (userOpt.isPresent()) {
            User u = userOpt.get();
            if (passwordEncoder.matches(loginRequest.getHashedPassword(), u.getHashedPassword())) {
                String role = u.getRole() != null ? u.getRole().name() : "USER";
                String token = jwtUtil.generateToken(u.getUsername(), role);
                u.setToken(token);
                logger.info("✅ Login exitoso para: {}", u.getUsername());
                return ResponseEntity.ok(u);
            } else {
                logger.warn("⚠️ Contraseña incorrecta para: {}", loginRequest.getUsername());
            }
        } else {
            logger.warn("⚠️ Usuario no encontrado: {}", loginRequest.getUsername());
        }
        return ResponseEntity.status(403).build();
    }

    @PutMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
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
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
