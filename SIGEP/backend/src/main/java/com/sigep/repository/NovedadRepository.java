package com.sigep.repository;

import com.sigep.model.Novedad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NovedadRepository extends JpaRepository<Novedad, String> {
    List<Novedad> findByUnitIdOrderByFechaDesc(String unitId);
    List<Novedad> findBySoldierIdOrderByFechaDesc(String soldierId);
}
