package com.simcop.config;

import com.simcop.model.User;
import com.simcop.model.UserRole;
import com.simcop.repository.UserRepository;
import com.simcop.model.Soldier;
import com.simcop.repository.SoldierRepository;
import com.simcop.model.MilitaryUnit;
import com.simcop.repository.MilitaryUnitRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.File;
import java.util.ArrayList;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    @Value("${app.admin.default-password:change-me-immediately}")
    private String defaultAdminPassword;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private MilitaryUnitRepository militaryUnitRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public static final java.util.Set<String> BANNED_DEFAULT_PASSWORDS = java.util.Set.of(
            "password", "admin", "123456", "12345678", "admin123",
            "change-me-immediately", "admin:password", "admin:admin",
            "simcop", "simcop2026", "password123", "root", "guest", "test", "ssc841209"
    );

    @Override
    public void run(String... args) throws Exception {
        ensureDataDirectoryExists();
        logger.info("Verificando e inicializando datos de seguridad táctica...");
        healDatabaseSchema();

        // Resolver contraseña administrativa inicial desde entorno o generar valor seguro
        String envSuperAdminPass = System.getenv("SIMCOP_SUPERADMIN_PASSWORD");
        if (envSuperAdminPass == null || envSuperAdminPass.trim().isEmpty()) {
            envSuperAdminPass = System.getenv("SIMCOP_ADMIN_PASSWORD");
        }
        String initialSecurePassword;
        if (envSuperAdminPass != null && !envSuperAdminPass.trim().isEmpty()) {
            initialSecurePassword = envSuperAdminPass.trim();
        } else if (defaultAdminPassword != null && !defaultAdminPassword.trim().isEmpty() && !"change-me-immediately".equals(defaultAdminPassword.trim()) && !BANNED_DEFAULT_PASSWORDS.contains(defaultAdminPassword.trim().toLowerCase())) {
            initialSecurePassword = defaultAdminPassword.trim();
        } else {
            // Generar contraseña segura aleatoria si no fue configurada en variables de entorno
            initialSecurePassword = java.util.UUID.randomUUID().toString();
            logger.info("ℹ️ Generada contraseña administrativa aleatoria segura para el arranque inicial.");
        }

        // Asegurar cuenta SuperAdmin santiago.salazar sin sobreescribir si ya existe
        if (userRepository.findByUsername("santiago.salazar").isEmpty()) {
            User ss = new User();
            ss.setUsername("santiago.salazar");
            ss.setDisplayName("Santiago Salazar (SuperAdmin)");
            ss.setHashedPassword(passwordEncoder.encode(initialSecurePassword));
            ss.setRole(UserRole.ADMINISTRATOR);
            ss.setTwoFactorEnabled(false);
            ss.setPermissions(new java.util.ArrayList<>());
            userRepository.save(ss);
            logger.info("Cuenta SuperAdmin santiago.salazar inicializada con credenciales seguras.");
        } else {
            logger.info("Cuenta SuperAdmin santiago.salazar detectada en base de datos. Preservando credenciales inmutables.");
        }

        // Asegurar cuenta administrativa de respaldo 'admin' con credenciales seguras
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setDisplayName("System Administrator");
            String adminInitialPass = (envSuperAdminPass != null && !envSuperAdminPass.trim().isEmpty())
                    ? envSuperAdminPass.trim()
                    : java.util.UUID.randomUUID().toString();
            admin.setHashedPassword(passwordEncoder.encode(adminInitialPass));
            admin.setRole(UserRole.ADMINISTRATOR);
            admin.setTwoFactorEnabled(false);
            admin.setPermissions(new ArrayList<>());
            userRepository.save(admin);
            logger.info("Cuenta administrativa de respaldo 'admin' inicializada con credenciales seguras.");
        }

        // Escaneo forense de seguridad: Revocar cualquier credencial por defecto o prohibida
        scanAndRevokeBannedPasswords(initialSecurePassword, envSuperAdminPass);
    }

    private void scanAndRevokeBannedPasswords(String initialSecurePassword, String envSuperAdminPass) {
        logger.info("🔍 Ejecutando escaneo de seguridad de contraseñas contra lista de credenciales prohibidas (VULN-001)...");
        var allUsers = userRepository.findAll();
        for (User user : allUsers) {
            String hash = user.getHashedPassword();
            if (hash == null || hash.isEmpty()) {
                user.setHashedPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
                userRepository.save(user);
                logger.warn("🚨 [SECURITY AUDIT] Usuario '{}' sin contraseña. Contraseña revocada y asegurada.", user.getUsername());
                continue;
            }

            boolean isBanned = false;
            for (String banned : BANNED_DEFAULT_PASSWORDS) {
                if (passwordEncoder.matches(banned, hash) || banned.equalsIgnoreCase(hash)) {
                    isBanned = true;
                    break;
                }
            }

            if (isBanned) {
                if ("santiago.salazar".equalsIgnoreCase(user.getUsername())) {
                    user.setHashedPassword(passwordEncoder.encode(initialSecurePassword));
                    userRepository.save(user);
                    logger.warn("🚨 [SECURITY AUDIT] Contraseña prohibida detectada en superadministrador 'santiago.salazar'. Restablecida a contraseña segura.");
                } else if ("admin".equalsIgnoreCase(user.getUsername())) {
                    String secureAdminPass = (envSuperAdminPass != null && !envSuperAdminPass.trim().isEmpty())
                            ? envSuperAdminPass.trim()
                            : java.util.UUID.randomUUID().toString();
                    user.setHashedPassword(passwordEncoder.encode(secureAdminPass));
                    userRepository.save(user);
                    logger.warn("🚨 [SECURITY AUDIT] Contraseña prohibida detectada en 'admin'. Cuenta asegurada con credencial de alta entropía.");
                } else {
                    user.setHashedPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
                    userRepository.save(user);
                    logger.warn("🚨 [SECURITY AUDIT] Revocada credencial débil/por defecto para usuario '{}' en arranque de BD.", user.getUsername());
                }
            }
        }
    }

    private void ensureDataDirectoryExists() {
        File dataDir = new File("./data");
        if (!dataDir.exists()) {
            logger.info("📁 Creando directorio de persistencia /data...");
            if (dataDir.mkdirs()) {
                logger.info("✅ Directorio /data creado exitosamente.");
            } else {
                logger.error("❌ No se pudo crear el directorio /data. La persistencia podría fallar.");
            }
        }
    }

    private void healDatabaseSchema() {
        try {
            logger.info("Verificando consistencia de esquema (Migracion silenciosa de lat/lon a location_lat/location_lon)...");
            
            // Check if old columns exist
            Integer latCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'military_units' AND COLUMN_NAME = 'lat'", 
                Integer.class
            );
            
            Integer locationLatCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'military_units' AND COLUMN_NAME = 'location_lat'", 
                Integer.class
            );

            if (latCount != null && latCount > 0 && locationLatCount != null && locationLatCount > 0) {
                int updated = jdbcTemplate.update(
                    "UPDATE military_units SET location_lat = lat, location_lon = lon WHERE location_lat IS NULL AND lat IS NOT NULL"
                );
                if (updated > 0) {
                    logger.info("Migracion de coordenadas completada. {} unidades curadas (Fantasmas resucitados).", updated);
                } else {
                    logger.info("No se requirio migracion de coordenadas, todas estan sincronizadas.");
                }
            } else {
                logger.info("Columnas heredadas lat/lon no detectadas o ya reemplazadas. Omitiendo curacion.");
            }
        } catch (Exception e) {
            logger.error("Error durante la curacion de la base de datos (Ignorando para continuar el inicio): {}", e.getMessage());
        }
    }
}
