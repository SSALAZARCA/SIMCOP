-- V9__Stabilize_Embedded_Collections.sql
-- Force column naming stabilization for embedded collections to match JPA @AttributeOverrides.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Standardize unit_route_history (Rename if they were created with default names by a previous attempt)
-- Logic: V8 created them as location_lat/location_lon.
-- Hibernate default without override would be lat/lon or route_history_lat.
-- We ensure the table matches our new explicit @AttributeOverrides.
ALTER TABLE unit_route_history MODIFY COLUMN location_lat DOUBLE PRECISION NOT NULL;
ALTER TABLE unit_route_history MODIFY COLUMN location_lon DOUBLE PRECISION NOT NULL;

-- 2. Standardize unit_uav_assets
-- In V8 we had location_lat/location_lon.
-- Our JPA mapping is location.lat -> location_lat.
ALTER TABLE unit_uav_assets MODIFY COLUMN location_lat DOUBLE PRECISION;
ALTER TABLE unit_uav_assets MODIFY COLUMN location_lon DOUBLE PRECISION;

-- 3. Standardize artillery_ammo
-- Ensure columns are named exactly as JPA expects (type, quantity)
ALTER TABLE artillery_ammo MODIFY COLUMN type VARCHAR(50);
ALTER TABLE artillery_ammo MODIFY COLUMN quantity INTEGER;

SET FOREIGN_KEY_CHECKS = 1;
