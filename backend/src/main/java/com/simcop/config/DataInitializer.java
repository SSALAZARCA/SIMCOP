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
        System.out.println("Checking and initializing security data...");
        healDatabaseSchema();

        // Ensure default admin exists
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setDisplayName("System Administrator");
            admin.setHashedPassword(passwordEncoder.encode("password"));
            admin.setRole(UserRole.ADMINISTRATOR);
            admin.setPermissions(new ArrayList<>());
            userRepository.save(admin);
            System.out.println("Default admin user created.");
        }

        // Ensure superadmin exists
        if (userRepository.findByUsername("superadmin").isEmpty()) {
            User sa = new User();
            sa.setUsername("superadmin");
            sa.setDisplayName("Super Administrator");
            sa.setHashedPassword(passwordEncoder.encode("password"));
            sa.setRole(UserRole.ADMINISTRATOR);
            sa.setPermissions(new java.util.ArrayList<>());
            userRepository.save(sa);
            System.out.println("Default superadmin user created.");
        }

        // Ensure santiago.salazar (SuperAdmin) exists with custom credentials
        if (userRepository.findByUsername("santiago.salazar").isEmpty()) {
            User ss = new User();
            ss.setUsername("santiago.salazar");
            ss.setDisplayName("Santiago Salazar (SuperAdmin)");
            ss.setHashedPassword(passwordEncoder.encode(defaultAdminPassword));
            ss.setRole(UserRole.ADMINISTRATOR);
            ss.setPermissions(new java.util.ArrayList<>());
            userRepository.save(ss);
            System.out.println("SuperAdmin santiago.salazar created with tactical access credentials.");
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
