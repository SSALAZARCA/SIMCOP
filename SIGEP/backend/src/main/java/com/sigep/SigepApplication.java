package com.sigep;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.sigep.repository.UserRepository;
import com.sigep.model.User;

import java.util.Arrays;
import java.util.UUID;

@SpringBootApplication
public class SigepApplication {

    public static void main(String[] args) {
        SpringApplication.run(SigepApplication.class, args);
    }


    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                String envOrigins = System.getenv("CORS_ALLOWED_ORIGINS");
                String[] origins;
                if (envOrigins != null && !envOrigins.trim().isEmpty()) {
                    origins = Arrays.stream(envOrigins.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toArray(String[]::new);
                } else {
                    origins = new String[]{
                            "http://localhost:3000",
                            "http://localhost:5173",
                            "http://localhost:80",
                            "http://localhost:8080",
                            "http://localhost:8085",
                            "http://127.0.0.1:3000",
                            "http://127.0.0.1:5173",
                            "http://127.0.0.1:8080",
                            "http://127.0.0.1:8085"
                    };
                }
                registry.addMapping("/**")
                        .allowedOrigins(origins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                        .allowedHeaders("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "X-Service-Token")
                        .exposedHeaders("Authorization", "X-Service-Token")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            userRepository.findByUsername("santiago.salazar").ifPresentOrElse(
                existingAdmin -> {
                    // Preservación inmutable: nunca sobrescribir credenciales del superadmin
                    // Migración defensiva: actualizar a BCrypt si la contraseña previa era texto claro
                    String currentPass = existingAdmin.getPassword();
                    if (currentPass != null && !currentPass.startsWith("$2a$") && !currentPass.startsWith("$2b$") && !currentPass.startsWith("$2y$")) {
                        existingAdmin.setPassword(passwordEncoder.encode(currentPass));
                        userRepository.save(existingAdmin);
                        System.out.println("🔒 Contraseña heredada de 'santiago.salazar' migrada a BCrypt.");
                    }
                },
                () -> {
                    String rawPassword = System.getenv("SIMCOP_SUPERADMIN_PASSWORD");
                    if (rawPassword == null || rawPassword.trim().isEmpty()) {
                        rawPassword = System.getenv("SIGEP_ADMIN_PASSWORD");
                    }
                    if (rawPassword == null || rawPassword.trim().isEmpty()) {
                        rawPassword = UUID.randomUUID().toString();
                    }
                    User admin = new User();
                    admin.setUsername("santiago.salazar");
                    admin.setPassword(passwordEncoder.encode(rawPassword));
                    admin.setRole("ROLE_ADMINISTRATOR");
                    admin.setDisplayName("Santiago Salazar (Admin)");
                    admin.setAssignedUnitId("NATIONAL");
                    userRepository.save(admin);
                    System.out.println("✅ Usuario maestro 'santiago.salazar' sembrado de forma segura con BCrypt en la BD de SIGEP.");
                }
            );
        };
    }
}

