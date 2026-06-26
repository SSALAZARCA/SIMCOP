-- V10__Recreate_Specialties_And_Fix_Alerts.sql
-- Recreate the missing specialties tables dropped in V8 but not recreated.

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS officer_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nco_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS professional_soldier_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regular_soldier_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS civilian_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;
