package com.simcop.repository;

import com.simcop.model.OsintEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OsintEventRepository extends JpaRepository<OsintEvent, String> {
    Optional<OsintEvent> findBySourceUrl(String sourceUrl);
}
