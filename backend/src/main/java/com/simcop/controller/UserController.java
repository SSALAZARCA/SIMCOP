package com.simcop.controller;

import com.simcop.model.AdminAuditLog;
import com.simcop.model.User;
import com.simcop.model.UserRole;
import com.simcop.repository.AdminAuditLogRepository;
import com.simcop.repository.UserRepository;
import com.simcop.security.DeceptionCatalog;
import com.simcop.service.LoginRateLimiterService;
import com.simcop.util.ClientIpResolver;
import com.simcop.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
@Transactional
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    public static final Set<UserRole> HIGH_PRIVILEGE_ROLES = Set.of(
            UserRole.ADMINISTRATOR,
            UserRole.COMANDANTE_EJERCITO,
            UserRole.COMANDANTE_DIVISION,
            UserRole.COMANDANTE_BRIGADA,
            UserRole.COMANDANTE_BATALLON,
            UserRole.OFICIAL_INTELIGENCIA
    );

    @Autowired
    private UserRepository repository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private com.simcop.service.TwoFactorService twoFactorService;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired(required = false)
    private AdminAuditLogRepository auditLogRepository;

    @Autowired(required = false)
    private com.simcop.service.ActiveCyberDefenseService activeCyberDefenseService;

    @Autowired(required = false)
    private com.simcop.service.SessionTrackingService sessionTrackingService;

    @Autowired(required = false)
    private com.simcop.service.GeoIpService geoIpService;

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
            // Null safety for password encoding and banned password check
            if (user.getHashedPassword() != null && !user.getHashedPassword().isEmpty()) {
                String rawPass = user.getHashedPassword().trim();
                for (String banned : com.simcop.config.DataInitializer.BANNED_DEFAULT_PASSWORDS) {
                    if (banned.equalsIgnoreCase(rawPass)) {
                        return ResponseEntity.badRequest().body(Map.of("error", "La contraseña elegida está en la lista de contraseñas débiles o por defecto prohibidas"));
                    }
                }
                user.setHashedPassword(passwordEncoder.encode(rawPass));
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
    public ResponseEntity<?> login(@RequestBody User loginRequest, HttpServletRequest request) {
        if (loginRequest != null && DeceptionCatalog.isHoneyUser(loginRequest.getUsername())) {
            String clientIp = ClientIpResolver.getClientIp(request);
            if (auditLogRepository != null) {
                auditLogRepository.save(new AdminAuditLog(System.currentTimeMillis(), "HONEY_USER_DECEPTION", "INTRUSION_ATTEMPT", "LOGIN", "IP " + clientIp + " attempted honey-user login: " + loginRequest.getUsername()));
            }
            if (activeCyberDefenseService != null) {
                activeCyberDefenseService.recordIntrusionAlert(
                        "HONEY_USER_LOGIN_ATTEMPT",
                        clientIp,
                        loginRequest.getUsername(),
                        "Honey-user credential stuffing attempt on decoy account: " + loginRequest.getUsername(),
                        "IP_ISOLATED_24H"
                );
            } else {
                rateLimiterService.blacklistIp(clientIp, 24 * 3600 * 1000L, "HONEY_USER_LOGIN_ATTEMPT: " + loginRequest.getUsername());
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales inválidas"));
        }

        String clientIp = ClientIpResolver.getClientIp(request);
        String username = (loginRequest != null) ? loginRequest.getUsername() : null;
        logger.info("🔑 Intento de login para usuario: {} desde IP: {}", username, clientIp);

        // 1. Verificación de Rate Limiting (Anti-Brute Force - VULN-002)
        if (rateLimiterService.isBlocked(clientIp, username)) {
            long retryAfter = rateLimiterService.getRemainingLockoutSeconds(clientIp);
            logger.warn("🚨 [RATE_LIMIT] Acceso bloqueado por exceso de intentos para IP {} / usuario {} (Retry-After: {}s)",
                    clientIp, username, retryAfter);
            return ResponseEntity.status(429)
                    .header("Retry-After", String.valueOf(retryAfter))
                    .body(Map.of(
                            "timestamp", java.time.Instant.now().toString(),
                            "status", 429,
                            "error", "Too Many Requests",
                            "message", "Too many failed login attempts. Please try again later.",
                            "retryAfterSeconds", retryAfter
                    ));
        }

        if (loginRequest == null || loginRequest.getUsername() == null || loginRequest.getUsername().trim().isEmpty()) {
            rateLimiterService.recordFailedAttempt(clientIp, username);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales inválidas"));
        }

        var userOpt = repository.findByUsername(loginRequest.getUsername());
        if (userOpt.isEmpty()) {
            logger.warn("⚠️ Usuario no encontrado: {}", loginRequest.getUsername());
            rateLimiterService.recordFailedAttempt(clientIp, username);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales inválidas"));
        }

        User u = userOpt.get();
        if (!passwordEncoder.matches(loginRequest.getHashedPassword(), u.getHashedPassword())) {
            logger.warn("⚠️ Contraseña incorrecta para: {}", loginRequest.getUsername());
            rateLimiterService.recordFailedAttempt(clientIp, username);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales inválidas"));
        }

        // 2. Verificación de 2FA / TOTP (VULN-004)
        boolean isHighPrivilege = u.getRole() != null && HIGH_PRIVILEGE_ROLES.contains(u.getRole());

        if (isHighPrivilege) {
            // A. Si no tiene 2FA configurado, requerir enrolamiento obligatorio y emitir token temporal de alcance restringido
            if (!Boolean.TRUE.equals(u.getTwoFactorEnabled()) || u.getTwoFactorSecret() == null || u.getTwoFactorSecret().trim().isEmpty()) {
                logger.warn("⚠️ Usuario de alto privilegio {} requiere configuración obligatoria de 2FA.", u.getUsername());
                String tempToken = jwtUtil.generatePreAuthToken(u.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "error", "2FA_SETUP_REQUIRED",
                        "message", "2FA es obligatorio para roles de mando y administración. Por favor configure su token TOTP.",
                        "tempToken", tempToken
                ));
            }

            // B. Si tiene 2FA configurado, exigir código TOTP
            if (loginRequest.getTotpCode() == null || loginRequest.getTotpCode().trim().isEmpty()) {
                logger.warn("Login fallido: 2FA requerido pero no proporcionado para {}", u.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "2FA_REQUIRED"));
            }

            boolean isValid = twoFactorService.isOtpValid(u.getTwoFactorSecret(), loginRequest.getTotpCode().trim());
            if (!isValid) {
                rateLimiterService.recordFailedAttempt(clientIp, u.getUsername());
                logger.warn("Login fallido: Código 2FA inválido para {}", u.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "INVALID_2FA_CODE"));
            }
        } else if (Boolean.TRUE.equals(u.getTwoFactorEnabled())) {
            // Usuario con 2FA opcional activado
            if (loginRequest.getTotpCode() == null || loginRequest.getTotpCode().trim().isEmpty()) {
                logger.warn("Login fallido: 2FA requerido pero no proporcionado para {}", u.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "2FA_REQUIRED"));
            }

            boolean isValid = twoFactorService.isOtpValid(u.getTwoFactorSecret(), loginRequest.getTotpCode().trim());
            if (!isValid) {
                rateLimiterService.recordFailedAttempt(clientIp, u.getUsername());
                logger.warn("Login fallido: Código 2FA inválido para {}", u.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "INVALID_2FA_CODE"));
            }
        }

        // 3. Emisión de JWT de sesión COMPLETO tras superar todas las verificaciones
        String role = u.getRole() != null ? u.getRole().name() : "USER";
        String token = jwtUtil.generateToken(u.getUsername(), role);
        u.setToken(token);
        rateLimiterService.recordSuccessfulLogin(clientIp, u.getUsername());

        // Registrar sesión activa para ACD y detección de viaje imposible
        if (sessionTrackingService != null) {
            com.simcop.model.embeddable.GeoLocation loc = (geoIpService != null)
                    ? geoIpService.resolveIp(clientIp)
                    : com.simcop.service.GeoIpService.BOGOTA_HQ;
            sessionTrackingService.recordUserSession(u.getUsername(), token, clientIp, loc, System.currentTimeMillis());
        }

        logger.info("✅ Login exitoso para: {}", u.getUsername());
        return ResponseEntity.ok(u);
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
