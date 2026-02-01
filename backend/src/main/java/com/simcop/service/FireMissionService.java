package com.simcop.service;

import com.simcop.model.FireMission;
import com.simcop.model.FireMissionStatus;
import com.simcop.repository.FireMissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class FireMissionService {

    @Autowired
    private FireMissionRepository repository;

    @Autowired
    private com.simcop.repository.ArtilleryPieceRepository artilleryRepository;

    public List<FireMission> getAllMissions() {
        return repository.findAll();
    }

    public List<FireMission> getMissionsByRequester(String requesterId) {
        return repository.findByRequesterId(requesterId);
    }

    public List<FireMission> getActiveMissions() {
        return repository.findByStatus(FireMissionStatus.ACTIVE);
    }

    public List<FireMission> getPendingMissions() {
        return repository.findByStatus(FireMissionStatus.PENDING);
    }

    @Transactional
    public FireMission createMission(FireMission mission) {
        // Ensure critical fields
        if (mission.getId() == null) {
            mission.setId(UUID.randomUUID().toString());
        }
        mission.setStatus(FireMissionStatus.PENDING);
        mission.setRequestTimestamp(System.currentTimeMillis());
        return repository.save(mission);
    }

    @Transactional
    public FireMission updateStatus(String id, FireMissionStatus status, String reason) {
        FireMission mission = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mission not found: " + id));

        // LOGISTICS CHECK: If firing, consume ammo
        if (status == FireMissionStatus.ACTIVE && mission.getStatus() != FireMissionStatus.ACTIVE) {
            if (mission.getAssignedArtilleryId() == null) {
                throw new RuntimeException("Cannot activate mission without assigned artillery.");
            }

            com.simcop.model.ArtilleryPiece piece = artilleryRepository.findById(mission.getAssignedArtilleryId())
                    .orElseThrow(() -> new RuntimeException("Assigned artillery not found"));

            String requestedType = mission.getProjectileType() != null ? mission.getProjectileType() : "HE";

            com.simcop.model.embeddable.AmmoStock stock = piece.getAmmunition().stream()
                    .filter(a -> a.getType().name().equalsIgnoreCase(requestedType))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Artillery has no ammo of type " + requestedType));

            if (stock.getQuantity() <= 0) {
                throw new RuntimeException("Artillery out of ammo!");
            }

            stock.setQuantity(stock.getQuantity() - 1);
            artilleryRepository.save(piece);
            mission.setFireTimestamp(System.currentTimeMillis());
        }

        mission.setStatus(status);
        if (status == FireMissionStatus.REJECTED && reason != null) {
            mission.setRejectionReason(reason);
        }
        if (status == FireMissionStatus.COMPLETED) {
            mission.setCompletedTimestamp(System.currentTimeMillis());
        }

        return repository.save(mission);
    }

    @Transactional
    public FireMission assignArtillery(String id, String artilleryId) {
        FireMission mission = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mission not found: " + id));

        com.simcop.model.ArtilleryPiece piece = artilleryRepository.findById(artilleryId)
                .orElseThrow(() -> new RuntimeException("Artillery piece not found: " + artilleryId));

        // PHYSICS CHECK: Range Validation
        double distMeters = com.simcop.util.GeoUtils.calculateDistanceMeters(piece.getLocation(),
                mission.getTargetLocation());
        if (distMeters > piece.getMaxRange() || distMeters < piece.getMinRange()) {
            throw new RuntimeException("Target out of effective range (" + (int) distMeters + "m). Range: " +
                    piece.getMinRange() + "-" + piece.getMaxRange() + "m");
        }

        mission.setAssignedArtilleryId(artilleryId);
        mission.setStatus(FireMissionStatus.APPROVED); // Ready to fire
        return repository.save(mission);
    }
}
