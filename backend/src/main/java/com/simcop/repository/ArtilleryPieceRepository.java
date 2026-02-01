package com.simcop.repository;

import com.simcop.model.ArtilleryPiece;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ArtilleryPieceRepository extends JpaRepository<ArtilleryPiece, String> {
}
