package com.simcop.repository;

import com.simcop.model.UAVMission;
import com.simcop.model.UAVMissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UAVMissionRepository extends JpaRepository<UAVMission, String> {
    List<UAVMission> findByRequesterUnitId(String requesterUnitId);

    List<UAVMission> findByDroneUnitId(String droneUnitId);

    List<UAVMission> findByStatus(UAVMissionStatus status);
}
