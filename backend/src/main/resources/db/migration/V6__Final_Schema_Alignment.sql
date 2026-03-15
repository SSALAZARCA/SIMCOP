-- V6__Final_Schema_Alignment.sql
-- This migration forces the alignment of AppConfiguration and embedded fields with Hibernate defaults.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Recreate app_configuration correctly
DROP TABLE IF EXISTS app_configuration;
CREATE TABLE app_configuration (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at DATETIME,
    updated_by VARCHAR(100)
);

-- 2. Align military_units location columns (Hibernate default: fieldName_nestedField)
-- Current in V5: lat, lon
ALTER TABLE military_units RENAME COLUMN lat TO location_lat;
ALTER TABLE military_units RENAME COLUMN lon TO location_lon;

-- 3. Align alerts location columns
ALTER TABLE alerts RENAME COLUMN lat TO location_lat;
ALTER TABLE alerts RENAME COLUMN lon TO location_lon;

-- 4. Align osint_events location columns
ALTER TABLE osint_events RENAME COLUMN lat TO location_lat;
ALTER TABLE osint_events RENAME COLUMN lon TO location_lon;

-- 5. Align intelligence_reports location columns
ALTER TABLE intelligence_reports RENAME COLUMN lat TO location_lat;
ALTER TABLE intelligence_reports RENAME COLUMN lon TO location_lon;

-- 6. Align fire_missions targetLocation columns (fieldName: targetLocation)
ALTER TABLE fire_missions RENAME COLUMN lat TO target_location_lat;
ALTER TABLE fire_missions RENAME COLUMN lon TO target_location_lon;

-- 7. Align unit_uav_assets nested location columns
ALTER TABLE unit_uav_assets RENAME COLUMN lat TO location_lat;
ALTER TABLE unit_uav_assets RENAME COLUMN lon TO location_lon;

SET FOREIGN_KEY_CHECKS = 1;
