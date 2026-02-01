package com.simcop.service;

import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class DoctrinalService {

    public List<String> getChecklistForMission(String missionType) {
        Map<String, List<String>> checklists = new HashMap<>();

        checklists.put("ataque", Arrays.asList(
                "Verificar línea de partida y hora H",
                "Establecer elemento de base de fuego",
                "Coordinar apoyo de fuegos indirectos",
                "Asegurar comunicaciones con flancos",
                "Plan de evacuación de heridos (MEDEVAC)"));

        checklists.put("defensa", Arrays.asList(
                "Establecer sectores de fuego",
                "Preparar posiciones principales y alternas",
                "Instalar obstáculos y minado coordinado",
                "Verificar campos de tiro despejados",
                "Enlace con unidades adyacentes"));

        checklists.put("reconocimiento", Arrays.asList(
                "Definir ruta de inserción y extracción",
                "Establecer puntos de reunión (ORP)",
                "Verificar equipo de observación y sigilo",
                "Protocolo de reporte de inteligencia",
                "Reglas de enfrentamiento (ROE) específicas"));

        return checklists.getOrDefault(missionType.toLowerCase(), Arrays.asList(
                "Verificar equipo de comunicaciones",
                "Confirmar órdenes de operación",
                "Revisar estado de suministros",
                "Garantizar seguridad del perímetro"));
    }
}
