package com.simcop.service;

import com.simcop.model.MilitaryUnit;
import com.simcop.model.User;
import com.simcop.model.UserRole;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.UserRepository;
import com.simcop.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class VisibilityService {

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    // Helper to extract User from Token
    public User getUserFromToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            String username = jwtUtil.extractUsername(jwt);
            return userRepository.findByUsername(username).orElse(null);
        }
        return null;
    }

    public List<MilitaryUnit> getVisibleUnits(User user) {
        List<MilitaryUnit> allUnits = unitRepository.findAll();

        // 1. Administrators see everything
        if (user.getRole() == UserRole.ADMINISTRATOR) {
            return allUnits;
        }

        // 2. Comandante Ejercito sees everything (top level)
        if (user.getRole() == UserRole.COMANDANTE_EJERCITO) {
            return allUnits; // Assuming he is top of chain
        }

        // 3. User with no assigned unit sees nothing (or maybe just themselves? strict
        // mode: nothing)
        if (user.getAssignedUnitId() == null) {
            return new ArrayList<>();
        }

        // 4. Hierarchical filtering
        // Build map for easier tree traversal
        Map<String, List<MilitaryUnit>> childrenMap = new HashMap<>();
        MilitaryUnit rootUnit = null;

        for (MilitaryUnit u : allUnits) {
            if (u.getId().equals(user.getAssignedUnitId())) {
                rootUnit = u;
            }
            if (u.getParentId() != null) {
                childrenMap.computeIfAbsent(u.getParentId(), k -> new ArrayList<>()).add(u);
            }
        }

        if (rootUnit == null) {
            // Assigned unit not found in DB
            return new ArrayList<>();
        }

        // Collect all descendants
        List<MilitaryUnit> visibleUnits = new ArrayList<>();
        collectDescendants(rootUnit, childrenMap, visibleUnits);

        return visibleUnits;
    }

    private void collectDescendants(MilitaryUnit current, Map<String, List<MilitaryUnit>> childrenMap,
            List<MilitaryUnit> result) {
        result.add(current);
        List<MilitaryUnit> children = childrenMap.get(current.getId());
        if (children != null) {
            for (MilitaryUnit child : children) {
                collectDescendants(child, childrenMap, result);
            }
        }
    }
}
