package com.sigep.repository;

import com.sigep.model.Transfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransferRepository extends JpaRepository<Transfer, String> {
    List<Transfer> findByOriginUnitIdOrDestinationUnitId(String originUnitId, String destinationUnitId);
    List<Transfer> findByRankCategory(String rankCategory);
    List<Transfer> findByRankCategoryAndOriginUnitIdOrRankCategoryAndDestinationUnitId(String rank1, String orig, String rank2, String dest);
}
