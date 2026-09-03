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
import java.util.Map;

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

    @Autowired
    private com.simcop.service.TwoFactorService twoFactorService;

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
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username cannot be empty"));
        }
        String cleanUsername = user.getUsername().trim();
        if (repository.existsByUsername(cleanUsername)) {
            logger.warn("⚠️ Intento de creación de usuario duplicado: {}", cleanUsername);
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body(Map.of("error", "Username already exists"));
        }
        logger.info("👤 Iniciando creación de usuario: {}", cleanUsername);
        try {
            user.setUsername(cleanUsername);
            // Null safety for password encoding
            if (user.getHashedPassword() != null && !user.getHashedPassword().isEmpty()) {
                user.setHashedPassword(passwordEncoder.encode(user.getHashedPassword()));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Password cannot be empty"));
            }
            User savedUser = repository.save(user);
            logger.info("✅ Usuario {} guardado exitosamente.", savedUser.getUsername());
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            logger.error("❌ Error al crear usuario {}: {}", user.getUsername(), e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        logger.info("🔑 Intento de login para usuario: {}", loginRequest.getUsername());
        var userOpt = repository.findByUsername(loginRequest.getUsername());
        if (userOpt.isPresent()) {
            User u = userOpt.get();
            if (passwordEncoder.matches(loginRequest.getHashedPassword(), u.getHashedPassword())) {
                
                // 2FA Verification
                if (Boolean.TRUE.equals(u.getTwoFactorEnabled())) {
                    if (loginRequest.getTotpCode() == null || loginRequest.getTotpCode().trim().isEmpty()) {
                        logger.warn("Login fallido: 2FA requerido pero no proporcionado para {}", u.getUsername());
                        return ResponseEntity.status(403).body("{\"error\": \"2FA_REQUIRED\"}");
                    }
                    boolean isValid = twoFactorService.isOtpValid(u.getTwoFactorSecret(), loginRequest.getTotpCode());
                    if (!isValid) {
                        logger.warn("Login fallido: Código 2FA inválido para {}", u.getUsername());
                        return ResponseEntity.status(403).body("{\"error\": \"INVALID_2FA_CODE\"}");
                    }
                }

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
            var userOpt = repository.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            User user = userOpt.get();
            String currentUsername = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();

            boolean isSuperAdmin = "santiago.salazar".equalsIgnoreCase(user.getUsername()) || "admin".equalsIgnoreCase(user.getUsername());
            if (isSuperAdmin) {
                // Bloquear modificación si no es el propio usuario o si se intenta degradar el rol
                if (userDetails.getRole() != null && userDetails.getRole() != com.simcop.model.UserRole.ADMINISTRATOR) {
                    logger.warn("⛔ Intento bloqueado de degradar rol de cuenta superadministrador: {}", user.getUsername());
                    return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                            .body(java.util.Map.of("error", "Superadmin accounts cannot be demoted"));
                }
                if (!currentUsername.equalsIgnoreCase(user.getUsername()) && !"santiago.salazar".equalsIgnoreCase(currentUsername)) {
                    logger.warn("⛔ Intento bloqueado de modificar cuenta superadministrador {} por {}", user.getUsername(), currentUsername);
                    return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                            .body(java.util.Map.of("error", "Superadmin accounts cannot be modified by other users"));
                }
            }

            user.setDisplayName(userDetails.getDisplayName());
            if (!isSuperAdmin) {
                user.setRole(userDetails.getRole());
            } else {
                user.setRole(com.simcop.model.UserRole.ADMINISTRATOR);
            }
            user.setPermissions(userDetails.getPermissions());
            user.setAssignedUnitId(userDetails.getAssignedUnitId());
            User updatedUser = repository.save(user);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            logger.error("Error updating user {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().body(java.util.Map.of("error", "Error updating user: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        var userOpt = repository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if ("santiago.salazar".equalsIgnoreCase(user.getUsername()) || "admin".equalsIgnoreCase(user.getUsername())) {
                logger.warn("⛔ Intento bloqueado de eliminar cuenta superadministrador protegida: {}", user.getUsername());
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                        .body(java.util.Map.of("error", "Superadmin accounts are immutable and cannot be deleted"));
            }
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
