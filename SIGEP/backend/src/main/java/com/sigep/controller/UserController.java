package com.sigep.controller;

import com.sigep.model.User;
import com.sigep.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        // En una app real se debe usar BCryptPasswordEncoder
        // pero lo guardaremos plano por ahora como el sistema de SIMCOP original
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User userDetails) {
        java.util.Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isPresent()) {
            User existingUser = optionalUser.get();
            // Evitar editar santiago.salazar para no romper el sistema
            if ("santiago.salazar".equals(existingUser.getUsername()) && !"santiago.salazar".equals(userDetails.getUsername())) {
                return ResponseEntity.status(403).build(); // No se puede cambiar el nombre del admin
            }
            existingUser.setDisplayName(userDetails.getDisplayName());
            existingUser.setRole(userDetails.getRole());
            existingUser.setAssignedUnitId(userDetails.getAssignedUnitId());
            if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
                existingUser.setPassword(userDetails.getPassword());
            }
            return ResponseEntity.ok(userRepository.save(existingUser));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        java.util.Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isPresent()) {
            User existingUser = optionalUser.get();
            if ("santiago.salazar".equals(existingUser.getUsername())) {
                return ResponseEntity.status(403).build(); // No se puede borrar el admin maestro
            }
            userRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
