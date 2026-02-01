package com.simcop.repository;

import com.simcop.model.ForwardObserver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ForwardObserverRepository extends JpaRepository<ForwardObserver, String> {
}
