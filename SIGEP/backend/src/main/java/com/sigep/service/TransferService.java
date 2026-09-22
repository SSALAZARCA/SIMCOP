package com.sigep.service;

import com.sigep.model.Novedad;
import com.sigep.model.Soldier;
import com.sigep.model.Transfer;
import com.sigep.repository.NovedadRepository;
import com.sigep.repository.SoldierRepository;
import com.sigep.repository.TransferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class TransferService {

    private static final Logger logger = LoggerFactory.getLogger(TransferService.class);

    @Autowired
    private TransferRepository transferRepository;

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private NovedadRepository novedadRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${simcop.service.token:simcop-tactical-m2m-secure-token-2026}")
    private String serviceToken;

    @Value("${simcop.webhook.url:http://backend:8080/api/webhooks/personnel/transfer-completed}")
    private String simcopWebhookUrl;

    @Transactional
    public Transfer createTransfer(Transfer transfer, String username, String unitId, String role) {
        // Si es Gestor de Batallón, el origen debe ser su unidad asignada
        if ("ROLE_BATALLON".equals(role)) {
            transfer.setOriginUnitId(unitId);
        }

        transfer.setStatus("PENDING_APPROVAL");
        transfer.setCreatedBy(username);

        return transferRepository.save(transfer);
    }

    @Transactional
    public Transfer updateTransferStatus(String transferId, String newStatus, String username, String role) {
        Transfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new IllegalArgumentException("Traslado no encontrado con ID: " + transferId));

        // Reglas de autorización para aprobación
        if ("APPROVED".equals(newStatus) && !("ROLE_EJERCITO".equals(role) || "ROLE_DIVISION".equals(role) || "ROLE_ADMINISTRATOR".equals(role))) {
            throw new SecurityException("Solo el Comando Superior puede aprobar traslados.");
        }

        if ("APPROVED".equals(newStatus)) {
            // Reasignación orgánica del efectivo militar
            Soldier approvedSoldier = null;
            if (transfer.getSoldierId() != null) {
                final Soldier[] soldierRef = new Soldier[1];
                soldierRepository.findById(transfer.getSoldierId()).ifPresent(soldier -> {
                    if (soldier.getUnitHistory() == null) {
                        soldier.setUnitHistory(new ArrayList<>());
                    }
                    if (transfer.getOriginUnitId() != null) {
                        soldier.getUnitHistory().add(transfer.getOriginUnitId());
                    }
                    soldier.setUnitId(transfer.getDestinationUnitId());
                    soldier.setAssignmentDate(LocalDate.now());
                    soldierRepository.save(soldier);
                    soldierRef[0] = soldier;
                });
                approvedSoldier = soldierRef[0];
            }

            // Auditoría forense de la novedad del traslado
            Novedad novedad = new Novedad();
            novedad.setSoldierId(transfer.getSoldierId());
            novedad.setUnitId(transfer.getDestinationUnitId());
            novedad.setTipo("TRASLADO");
            novedad.setFecha(LocalDateTime.now());
            novedad.setDescripcion("Traslado orgánico aprobado desde unidad " + transfer.getOriginUnitId() +
                    " hacia unidad " + transfer.getDestinationUnitId() + " por " + username);
            novedad.setRegistradoPor(username);
            novedadRepository.save(novedad);

            // Notificar a SIMCOP vía Webhook M2M
            notifySimcopWebhook(transfer, approvedSoldier);
        }

        transfer.setStatus(newStatus);
        return transferRepository.save(transfer);
    }

    /**
     * Emite el Webhook M2M hacia SIMCOP para sincronizar el traslado aprobado.
     * Los errores de red no bloquean el flujo administrativo de SIGEP.
     */
    private void notifySimcopWebhook(Transfer transfer, Soldier soldier) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Service-Token", serviceToken);
            headers.set("Authorization", "Bearer " + serviceToken);

            Map<String, Object> payload = new HashMap<>();
            Map<String, Object> eventPayload = new HashMap<>();
            eventPayload.put("soldier_id", transfer.getSoldierId());
            eventPayload.put("target_unit_id", transfer.getDestinationUnitId());
            if (soldier != null) {
                eventPayload.put("name", soldier.getName());
                eventPayload.put("rank", soldier.getRank());
                eventPayload.put("mos_code", soldier.getMosCode());
            }
            payload.put("payload", eventPayload);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(simcopWebhookUrl, entity, String.class);
            logger.info("[WEBHOOK_M2M] Traslado del soldado {} notificado a SIMCOP exitosamente.", transfer.getSoldierId());
        } catch (Exception e) {
            logger.error("[WEBHOOK_M2M] Error al notificar traslado a SIMCOP (no bloquea SIGEP): {}", e.getMessage());
        }
    }
}
