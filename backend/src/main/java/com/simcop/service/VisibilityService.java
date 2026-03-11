package com.simcop.service;

import com.simcop.model.MilitaryUnit;
import com.simcop.model.User;
import com.simcop.model.UserRole;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.UserRepository;
import com.simcop.util.GeoUtils;
import com.simcop.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class VisibilityService {

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

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

        if (user.getRole() == UserRole.ADMINISTRATOR || user.getRole() == UserRole.COMANDANTE_EJERCITO) {
            return allUnits;
        }

        if (user.getPermissions() != null && user.getPermissions().contains("NATIONAL_VIEW")) {
            return allUnits;
        }

        if (user.getAssignedUnitId() == null) {
            return new ArrayList<>();
        }

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
            return new ArrayList<>();
        }

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

    public boolean isLocationVisibleToUser(GeoLocation location, User user) {
        if (user == null || location == null)
            return false;

        if (user.getRole() == UserRole.ADMINISTRATOR || user.getRole() == UserRole.COMANDANTE_EJERCITO) {
            return true;
        }

        if (user.getPermissions() != null && user.getPermissions().contains("NATIONAL_VIEW")) {
            return true;
        }

        if (user.getAssignedUnitId() == null)
            return false;

        Optional<MilitaryUnit> unitOpt = unitRepository.findById(user.getAssignedUnitId());
        if (unitOpt.isPresent()) {
            MilitaryUnit unit = unitOpt.get();
            String aoValue = unit.getAreaOfOperations();
            if (aoValue != null && !aoValue.isEmpty()) {
                return GeoUtils.isPointInPolygon(location, aoValue);
            }
            return true;
        }

        return false;
    }
}
