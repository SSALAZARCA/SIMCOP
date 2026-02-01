package com.simcop.repository;

import com.simcop.model.FireMission;
import com.simcop.model.FireMissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FireMissionRepository extends JpaRepository<FireMission, String> {
    List<FireMission> findByStatus(FireMissionStatus status);

    List<FireMission> findByRequesterId(String requesterId);

    List<FireMission> findByAssignedArtilleryId(String assignedArtilleryId);
}
