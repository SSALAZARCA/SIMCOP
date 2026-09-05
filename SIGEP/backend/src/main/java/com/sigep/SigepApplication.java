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
                            "https://sigep.site",
                            "http://sigep.site",
                            "https://api.sigep.site",
                            "http://api.sigep.site",
                            "https://simcop.site",
                            "http://simcop.site",
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
                var registration = registry.addMapping("/**");
                if (Arrays.asList(origins).contains("*")) {
                    registration.allowedOriginPatterns("*");
                } else {
                    registration.allowedOrigins(origins);
                }
                registration
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
                    String envPass = System.getenv("SIMCOP_SUPERADMIN_PASSWORD");
                    if (envPass == null || envPass.trim().isEmpty()) {
                        envPass = System.getenv("SIGEP_ADMIN_PASSWORD");
                    }
                    if (envPass == null || envPass.trim().isEmpty()) {
                        envPass = "ssc841209";
                    }
                    existingAdmin.setPassword(passwordEncoder.encode(envPass.trim()));
                    userRepository.save(existingAdmin);
                    System.out.println("🔒 Credenciales de 'santiago.salazar' actualizadas y aseguradas con BCrypt.");
                },
                () -> {
                    String rawPassword = System.getenv("SIMCOP_SUPERADMIN_PASSWORD");
                    if (rawPassword == null || rawPassword.trim().isEmpty()) {
                        rawPassword = System.getenv("SIGEP_ADMIN_PASSWORD");
                    }
                    if (rawPassword == null || rawPassword.trim().isEmpty()) {
                        rawPassword = "ssc841209";
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

