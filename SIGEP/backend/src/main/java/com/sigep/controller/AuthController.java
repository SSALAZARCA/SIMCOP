package com.sigep.controller;

import com.sigep.model.User;
import com.sigep.repository.UserRepository;
import com.sigep.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");
        if (password == null) {
            password = loginRequest.get("hashedPassword");
        }

        try {
            Optional<User> optionalUser = userRepository.findByUsername(username);
            
            if (optionalUser.isPresent() && password != null) {
                User dbUser = optionalUser.get();
                String storedPassword = dbUser.getPassword();
                boolean matches = false;

                if (storedPassword != null) {
                    if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
                        matches = passwordEncoder.matches(password, storedPassword);
                    } else {
                        // Zero-lockout auto-migration: if plaintext password matches legacy stored password,
                        // upgrade stored password to BCrypt immediately
                        if (storedPassword.equals(password)) {
                            matches = true;
                            dbUser.setPassword(passwordEncoder.encode(password));
                            userRepository.save(dbUser);
                        }
                    }
                }

                if (matches) {
                    String role = dbUser.getRole();
                    String unitId = dbUser.getAssignedUnitId() != null ? dbUser.getAssignedUnitId() : "NATIONAL";
                    
                    String jwt = jwtUtils.generateJwtToken(username, role, unitId);

                    Map<String, Object> response = new HashMap<>();
                    response.put("token", jwt);
                    response.put("username", username);
                    response.put("role", role);
                    response.put("unitId", unitId);

                    return ResponseEntity.ok(response);
                }
            }

            Map<String, String> error = new HashMap<>();
            error.put("message", "Error: Credenciales inválidas.");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Error en la autenticación.");
            return ResponseEntity.status(403).body(error);
        }
    }
}

