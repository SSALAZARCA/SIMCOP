package com.simcop.repository;

import com.simcop.model.OperationalGraphic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OperationalGraphicRepository extends JpaRepository<OperationalGraphic, String> {
    List<OperationalGraphic> findByHiddenTimestampIsNull();

    List<OperationalGraphic> findByPlantillaTypeAndHiddenTimestampIsNull(String plantillaType);
}
