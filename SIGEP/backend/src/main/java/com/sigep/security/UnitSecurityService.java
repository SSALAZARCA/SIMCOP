package com.sigep.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class UnitSecurityService {

    @Autowired(required = false)
    private com.sigep.service.SimcopSyncService simcopSyncService;

    // Mapa doctrinal de unidades: ID -> ParentID
    private final Map<String, String> doctrinalParentMap = new HashMap<>();
    private final Map<String, String> aliasMap = new HashMap<>();

    public UnitSecurityService() {
        // Alias de normalización
        aliasMap.put("DIV01", "DIV1");
        aliasMap.put("BR01", "BR1");
        aliasMap.put("BAT01", "BAEEV4");

        // 1ª División del Ejército
        doctrinalParentMap.put("DIV1", null);
        doctrinalParentMap.put("BR1", "DIV1");
        doctrinalParentMap.put("BAEEV4", "BR1");
        doctrinalParentMap.put("BATRO3", "BR1");

        // 8ª División del Ejército (Estructura SIMCOP)
        doctrinalParentMap.put("8-DIV", null);
        
        // 16ª Brigada
        doctrinalParentMap.put("16-BRIG", "8-DIV");
        doctrinalParentMap.put("BI-44", "16-BRIG");
        doctrinalParentMap.put("GM-16", "16-BRIG");
        doctrinalParentMap.put("BEING-16", "16-BRIG");
        doctrinalParentMap.put("BASPC-16", "16-BRIG");

        // 18ª Brigada
        doctrinalParentMap.put("18-BRIG", "8-DIV");
        doctrinalParentMap.put("BI-24", "18-BRIG");
        doctrinalParentMap.put("GM-18", "18-BRIG");
        doctrinalParentMap.put("BA-18", "18-BRIG");

        // 28ª Brigada
        doctrinalParentMap.put("28-BRIG", "8-DIV");
        doctrinalParentMap.put("BIS-45", "28-BRIG");
    }

    public String normalizeUnitId(String unitId) {
        if (unitId == null) return null;
        String trimmed = unitId.trim();
        return aliasMap.getOrDefault(trimmed.toUpperCase(), trimmed);
    }

    public boolean isNationalScope(String role, String assignedUnitId) {
        if (role == null) return false;
        String r = role.toUpperCase();
        return r.equals("ROLE_ADMINISTRATOR") || 
               r.equals("ADMINISTRATOR") || 
               r.equals("ROLE_EJERCITO") || 
               r.equals("ROLE_COMANDANTE_EJERCITO") || 
               r.equals("COMANDANTE_EJERCITO") || 
               "NATIONAL".equalsIgnoreCase(assignedUnitId) ||
               assignedUnitId == null ||
               assignedUnitId.isBlank();
    }

    /**
     * Retorna el conjunto de IDs de unidades autorizadas para un usuario (su unidad y todas sus subordinadas).
     */
    public Set<String> getAccessibleUnitIds(String role, String assignedUnitId) {
        if (isNationalScope(role, assignedUnitId)) {
            // Retorna un set con todas las unidades conocidas y marcador de acceso total
            Set<String> all = new HashSet<>(doctrinalParentMap.keySet());
            all.add("*"); // wildcard para acceso nacional
            return all;
        }

        String rootId = normalizeUnitId(assignedUnitId);
        if (rootId == null || rootId.isBlank()) {
            return Collections.emptySet();
        }

        // Construir mapa combinado (doctrinal + dinámico desde SIMCOP si está disponible)
        Map<String, String> parentMap = new HashMap<>(doctrinalParentMap);
        if (simcopSyncService != null) {
            try {
                List<Map<String, Object>> liveUnits = simcopSyncService.getLiveUnitsFromSimcop();
                if (liveUnits != null) {
                    for (Map<String, Object> u : liveUnits) {
                        String id = (String) u.get("id");
                        String parent = (String) u.get("parentId");
                        if (id != null) {
                            parentMap.put(id, parent);
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        // BFS / DFS para recolectar el nodo raíz y todos sus descendientes
        Set<String> accessible = new HashSet<>();
        Queue<String> queue = new LinkedList<>();
        queue.add(rootId);
        accessible.add(rootId);

        // También registrar el ID sin normalizar si difiere
        if (!rootId.equals(assignedUnitId)) {
            accessible.add(assignedUnitId);
        }

        while (!queue.isEmpty()) {
            String current = queue.poll();
            for (Map.Entry<String, String> entry : parentMap.entrySet()) {
                String childId = entry.getKey();
                String parentId = entry.getValue();
                if (current.equalsIgnoreCase(parentId) && !accessible.contains(childId)) {
                    accessible.add(childId);
                    queue.add(childId);
                }
            }
        }

        return accessible;
    }

    /**
     * Verifica si el usuario autenticado tiene permiso de acceso a una unidad objetivo.
     */
    public boolean isUnitAuthorized(Authentication authentication, String targetUnitId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        String role = authentication.getAuthorities().isEmpty() ? "" : 
                authentication.getAuthorities().iterator().next().getAuthority();
        String assignedUnitId = authentication.getDetails() instanceof String ? 
                (String) authentication.getDetails() : null;

        if (isNationalScope(role, assignedUnitId)) {
            return true;
        }

        if (targetUnitId == null || targetUnitId.isBlank()) {
            return false;
        }

        String normalizedTarget = normalizeUnitId(targetUnitId);
        Set<String> accessible = getAccessibleUnitIds(role, assignedUnitId);
        
        return accessible.contains("*") || 
               accessible.contains(targetUnitId) || 
               accessible.contains(normalizedTarget);
    }
}
