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
        } else if (defaultAdminPassword != null && !defaultAdminPassword.trim().isEmpty() && !"change-me-immediately".equals(defaultAdminPassword.trim())) {
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
        }

        // Asegurar cuenta administrativa de respaldo 'admin' si no existe
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setDisplayName("System Administrator");
            admin.setHashedPassword(passwordEncoder.encode(initialSecurePassword));
            admin.setRole(UserRole.ADMINISTRATOR);
            admin.setTwoFactorEnabled(false);
            admin.setPermissions(new ArrayList<>());
            userRepository.save(admin);
            logger.info("Cuenta administrativa de respaldo inicializada.");
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
