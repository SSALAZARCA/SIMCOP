package com.sigep.controller;

import com.sigep.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private com.sigep.repository.UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        try {
            java.util.Optional<com.sigep.model.User> optionalUser = userRepository.findByUsername(username);
            
            if (optionalUser.isPresent() && optionalUser.get().getPassword().equals(password)) {
                com.sigep.model.User dbUser = optionalUser.get();
                String role = dbUser.getRole();
                String unitId = dbUser.getAssignedUnitId() != null ? dbUser.getAssignedUnitId() : "NATIONAL";
                
                String jwt = jwtUtils.generateJwtToken(username, role, unitId);

                Map<String, Object> response = new HashMap<>();
                response.put("token", jwt);
                // No enviamos simcopToken porque no somos SSO
                response.put("username", username);
                response.put("role", role);
                response.put("unitId", unitId);

                return ResponseEntity.ok(response);
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Error: Credenciales inválidas.");
                return ResponseEntity.badRequest().body(error);
            }
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Error en la autenticación.");
            return ResponseEntity.status(403).body(error);
        }
    }
}
