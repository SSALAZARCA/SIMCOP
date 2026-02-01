package com.simcop.repository;

import com.simcop.model.Soldier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SoldierRepository extends JpaRepository<Soldier, String> {
    List<Soldier> findByUnitId(String unitId);

    List<Soldier> findByMoceCode(String moceCode);

    List<Soldier> findByRank(String rank);
}
