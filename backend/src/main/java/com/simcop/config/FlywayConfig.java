package com.simcop.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Estrategia de migración personalizada para Flyway.
 * Fuerza una reparación del historial antes de migrar para resolver
 * estados "FAILED" que bloquean el arranque del backend.
 */
@Configuration
public class FlywayConfig {

    private static final Logger logger = LoggerFactory.getLogger(FlywayConfig.class);

    @Bean
    public FlywayMigrationStrategy cleanMigrationStrategy() {
        return flyway -> {
            logger.info(">>> Flyway: Ejecutando reparación forzada del historial...");
            try {
                // Primero reparamos por si acaso la tabla flyway_schema_history está corrupta
                flyway.repair();
                logger.info(">>> Flyway: Reparación completada. Procediendo a migrar...");
                
                // Luego ejecutamos la migración
                flyway.migrate();
                logger.info(">>> Flyway: Migración completada exitosamente.");
            } catch (Exception e) {
                logger.error(">>> Flyway error durante la estrategia personalizada: {}", e.getMessage());
                throw e;
            }
        };
    }
}
