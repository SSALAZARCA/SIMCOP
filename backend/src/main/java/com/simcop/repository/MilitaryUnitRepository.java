package com.simcop.repository;

import com.simcop.model.MilitaryUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MilitaryUnitRepository extends JpaRepository<MilitaryUnit, String> {
    @Query("SELECT DISTINCT u FROM MilitaryUnit u JOIN u.uavAssets a")
    List<MilitaryUnit> findUnitsWithUavs();
}
