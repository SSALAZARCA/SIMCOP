package com.simcop.repository;

import com.simcop.model.AppConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppConfigurationRepository extends JpaRepository<AppConfiguration, Long> {

    Optional<AppConfiguration> findByConfigKey(String configKey);

    boolean existsByConfigKey(String configKey);
}
