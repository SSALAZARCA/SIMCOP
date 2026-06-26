package com.simcop.config;

import org.flywaydb.core.Flyway;
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

    @Bean
    public FlywayMigrationStrategy cleanMigrationStrategy() {
        return flyway -> {
            System.out.println(">>> Flyway: Ejecutando reparación forzada del historial...");
            try {
                // Primero reparamos por si acaso la tabla flyway_schema_history está corrupta
                flyway.repair();
                System.out.println(">>> Flyway: Reparación completada. Procediendo a migrar...");
                
                // Luego ejecutamos la migración
                flyway.migrate();
                System.out.println(">>> Flyway: Migración completada exitosamente.");
            } catch (Exception e) {
                System.err.println(">>> Flyway error durante la estrategia personalizada: " + e.getMessage());
                // Si falla de nuevo, intentamos limpiar (clean) si está permitido
                // flyway.clean(); 
                // flyway.migrate();
                throw e;
            }
        };
    }
}
