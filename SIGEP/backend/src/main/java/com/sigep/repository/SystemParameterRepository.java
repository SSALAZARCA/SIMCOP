package com.sigep.repository;

import com.sigep.model.SystemParameter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemParameterRepository extends JpaRepository<SystemParameter, String> {
}
