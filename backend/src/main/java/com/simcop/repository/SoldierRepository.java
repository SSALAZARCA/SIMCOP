package com.simcop.repository;

import com.simcop.model.Soldier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SoldierRepository extends JpaRepository<Soldier, String> {
    @Query("SELECT s FROM Soldier s WHERE s.unit.id = :unitId")
    List<Soldier> findByUnitId(@Param("unitId") String unitId);

    List<Soldier> findByMoceCode(String moceCode);

    List<Soldier> findByRank(String rank);
}
