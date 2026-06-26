package com.sigep.repository;

import com.sigep.model.Soldier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SoldierRepository extends JpaRepository<Soldier, String> {
    List<Soldier> findByUnitIdAndStatus(String unitId, String status);
}
