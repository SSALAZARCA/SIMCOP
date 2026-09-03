package com.sigep;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import org.springframework.boot.CommandLineRunner;
import com.sigep.repository.UserRepository;
import com.sigep.model.User;
import java.util.UUID;

@SpringBootApplication
public class SigepApplication {

    public static void main(String[] args) {
        SpringApplication.run(SigepApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // Allow frontend React to connect
                registry.addMapping("/**").allowedOrigins("*").allowedMethods("*");
            }
        };
    }

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository) {
        return args -> {
            if (userRepository.findByUsername("santiago.salazar").isEmpty()) {
                User admin = new User();
                admin.setUsername("santiago.salazar");
                admin.setPassword(System.getenv("SIMCOP_SUPERADMIN_PASSWORD") != null ? System.getenv("SIMCOP_SUPERADMIN_PASSWORD") : (System.getenv("SIGEP_ADMIN_PASSWORD") != null ? System.getenv("SIGEP_ADMIN_PASSWORD") : UUID.randomUUID().toString()));
                admin.setRole("ROLE_ADMINISTRATOR");
                admin.setDisplayName("Santiago Salazar (Admin)");
                admin.setAssignedUnitId("NATIONAL");
                userRepository.save(admin);
                System.out.println("✅ Usuario maestro 'santiago.salazar' sembrado en la BD de SIGEP.");
            }
        };
    }
}
