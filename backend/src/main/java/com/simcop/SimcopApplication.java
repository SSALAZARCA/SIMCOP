package com.simcop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * SIMCOP Backend Application
 *
 * FlywayAutoConfiguration is excluded because:
 * - Flyway is not used for schema management (Hibernate DDL auto handles it).
 * - Even with spring.flyway.enabled=false, the FlywayAutoConfiguration bean
 *   still initializes and creates a circular dependency with entityManagerFactory,
 *   preventing the Spring context from starting (causes 502 on VPS).
 */
@SpringBootApplication(exclude = {FlywayAutoConfiguration.class})
@EnableScheduling
public class SimcopApplication {

	public static void main(String[] args) {
		SpringApplication.run(SimcopApplication.class, args);
	}

}
