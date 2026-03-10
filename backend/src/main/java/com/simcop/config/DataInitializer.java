package com.simcop.config;

import com.simcop.model.User;
import com.simcop.model.UserRole;
import com.simcop.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByUsername("admin").isEmpty()) {
            System.out.println("Initializing default admin...");

            User admin = new User();
            admin.setUsername("admin");
            admin.setDisplayName("System Administrator");
            admin.setHashedPassword(passwordEncoder.encode("password"));
            admin.setRole(UserRole.ADMINISTRATOR);
            admin.setPermissions(new ArrayList<>());

            userRepository.save(admin);
            System.out.println("Default admin user created: username=admin, password=password");
        }

        if (userRepository.findByUsername("santiago.salazar").isEmpty()) {
            System.out.println("Initializing santiago.salazar user...");
            User santiago = new User();
            santiago.setUsername("santiago.salazar");
            santiago.setDisplayName("Santiago Salazar");
            santiago.setHashedPassword(passwordEncoder.encode("ssc841209"));
            santiago.setRole(UserRole.ADMINISTRATOR);

            ArrayList<String> allPermissions = new ArrayList<>();
            allPermissions.add("DASHBOARD");
            allPermissions.add("ORGANIZATION_STRUCTURE");
            allPermissions.add("MAP_DISPLAY");
            allPermissions.add("LOGISTICS");
            allPermissions.add("USER_MANAGEMENT");
            allPermissions.add("SETTINGS");
            allPermissions.add("PERSONNEL");

            santiago.setPermissions(allPermissions);
            userRepository.save(santiago);
            System.out.println("Santiago Salazar user created");
        }
    }
}
