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

    @SuppressWarnings("null")
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

        if (user.getPermissions() != null && (user.getPermissions().contains("NATIONAL_VIEW") || user.getPermissions().contains("VISTA_NACIONAL"))) {
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

    public List<com.simcop.model.IntelligenceReport> getVisibleReports(User user, List<com.simcop.model.IntelligenceReport> allReports) {
        if (user.getRole() == UserRole.ADMINISTRATOR || user.getRole() == UserRole.COMANDANTE_EJERCITO) {
            return allReports;
        }

        if (user.getPermissions() != null && (user.getPermissions().contains("NATIONAL_VIEW") || user.getPermissions().contains("VISTA_NACIONAL"))) {
            return allReports;
        }

        if (user.getAssignedUnitId() == null) {
            return new ArrayList<>();
        }

        // Logical filter: User sees reports from their unit and subordinates
        List<MilitaryUnit> visibleUnits = getVisibleUnits(user);
        Set<String> visibleUnitIds = new HashSet<>();
        for (MilitaryUnit u : visibleUnits) {
            visibleUnitIds.add(u.getId());
        }

        List<com.simcop.model.IntelligenceReport> visibleReports = new ArrayList<>();
        for (com.simcop.model.IntelligenceReport r : allReports) {
            if (r.getReportingUnitId() == null || visibleUnitIds.contains(r.getReportingUnitId())) {
                visibleReports.add(r);
            }
        }
        return visibleReports;
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

        String assignedId = user.getAssignedUnitId();
        if (assignedId == null)
            return false;

        Optional<MilitaryUnit> unitOpt = unitRepository.findById(assignedId);
        if (unitOpt.isPresent()) {
            MilitaryUnit unit = unitOpt.get();
            String aoValue = unit.getAreaOfOperations();
            if (aoValue != null && !aoValue.isEmpty()) {
                return GeoUtils.isPointInPolygon(location, aoValue);
            }
            // If they have a unit but no specific AO defined, they see a proximity radius (e.g., 5km)
            return GeoUtils.calculateDistanceMeters(unit.getLocation(), location) <= 5000;
        }

        return false;
    }

    /**
     * Optimized visibility check for high-volume streams.
     */
    public boolean isLocationVisibleWithPreloadedAo(GeoLocation location, User user, String preloadedAo) {
        if (user == null || location == null)
            return false;

        if (user.getRole() == UserRole.ADMINISTRATOR || user.getRole() == UserRole.COMANDANTE_EJERCITO) {
            return true;
        }

        if (user.getPermissions() != null && user.getPermissions().contains("NATIONAL_VIEW")) {
            return true;
        }

        // If not national view, must have a unit assigned.
        if (user.getAssignedUnitId() == null) {
            return false;
        }

        if (preloadedAo == null || preloadedAo.isEmpty()) {
            String assignedUnitId = user.getAssignedUnitId();
            if (assignedUnitId != null) {
                Optional<MilitaryUnit> unitOpt = unitRepository.findById(assignedUnitId);
                if (unitOpt.isPresent()) {
                    return GeoUtils.calculateDistanceMeters(unitOpt.get().getLocation(), location) <= 5000;
                }
            }
            return false;
        }

        return GeoUtils.isPointInPolygon(location, preloadedAo);
    }

    public String getPreloadedAoForUser(User user) {
        if (user == null)
            return null;
        String assignedId = user.getAssignedUnitId();
        if (assignedId == null)
            return null;

        return unitRepository.findById(assignedId)
                .map(MilitaryUnit::getAreaOfOperations)
                .orElse(null);
    }
}
