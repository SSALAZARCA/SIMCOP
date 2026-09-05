package com.sigep.controller;

import com.sigep.dto.UserResponseDTO;
import com.sigep.model.User;
import com.sigep.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponseDTO::fromEntity)
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre de usuario no puede estar vacío"));
        }
        String cleanUsername = user.getUsername().trim();
        if (userRepository.findByUsername(cleanUsername).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "El nombre de usuario ya existe"));
        }
        if (user.getPassword() == null || user.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "La contraseña no puede estar vacía"));
        }

        user.setUsername(cleanUsername);
        user.setPassword(encodePasswordIfPlain(user.getPassword().trim()));
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(UserResponseDTO.fromEntity(savedUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User userDetails) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isPresent()) {
            User existingUser = optionalUser.get();
            // Evitar editar santiago.salazar para no romper el sistema
            if ("santiago.salazar".equals(existingUser.getUsername()) && !"santiago.salazar".equals(userDetails.getUsername())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "No se puede cambiar el nombre del administrador maestro"));
            }
            existingUser.setDisplayName(userDetails.getDisplayName());
            existingUser.setRole(userDetails.getRole());
            existingUser.setAssignedUnitId(userDetails.getAssignedUnitId());
            if (userDetails.getPassword() != null && !userDetails.getPassword().trim().isEmpty()) {
                existingUser.setPassword(encodePasswordIfPlain(userDetails.getPassword().trim()));
            }
            User updatedUser = userRepository.save(existingUser);
            return ResponseEntity.ok(UserResponseDTO.fromEntity(updatedUser));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isPresent()) {
            User existingUser = optionalUser.get();
            if ("santiago.salazar".equals(existingUser.getUsername())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "No se puede borrar el administrador maestro"));
            }
            userRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    private String encodePasswordIfPlain(String rawOrHashed) {
        if (rawOrHashed == null || rawOrHashed.isEmpty()) {
            return rawOrHashed;
        }
        if (rawOrHashed.matches("^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$")) {
            return rawOrHashed;
        }
        return passwordEncoder.encode(rawOrHashed);
    }
}

