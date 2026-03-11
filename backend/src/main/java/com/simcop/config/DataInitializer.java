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
        System.out.println("Checking and initializing security data...");

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
            ss.setHashedPassword(passwordEncoder.encode("ssc841209"));
            ss.setRole(UserRole.ADMINISTRATOR);
            ss.setPermissions(new java.util.ArrayList<>());
            userRepository.save(ss);
            System.out.println("SuperAdmin santiago.salazar created with tactical access credentials.");
        }
    }
}
