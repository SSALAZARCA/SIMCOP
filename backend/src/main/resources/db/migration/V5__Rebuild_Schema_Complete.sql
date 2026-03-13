-- Simcop 3.0: Total Schema Rebuild
-- This script drops all tables and recreates them to ensure a clean state as requested.

-- 1. Drop existing tables (in correct order of dependencies)
DROP TABLE IF EXISTS professional_soldier_specialties;
DROP TABLE IF EXISTS regular_soldier_specialties;
DROP TABLE IF EXISTS civilian_specialties;
DROP TABLE IF EXISTS nco_specialties;
DROP TABLE IF EXISTS officer_specialties;
DROP TABLE IF EXISTS unit_uav_assets;
DROP TABLE IF EXISTS unit_route_history;
DROP TABLE IF EXISTS military_unit_capabilities;
DROP TABLE IF EXISTS military_unit_equipment;
DROP TABLE IF EXISTS soldiers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS military_units;
DROP TABLE IF EXISTS osint_events;

-- 2. Create tables
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    permissions JSON,
    assigned_unit_id VARCHAR(36),
    telegram_chat_id VARCHAR(50)
);

CREATE TABLE military_units (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    commander_rank VARCHAR(50),
    commander_name VARCHAR(255),
    
    -- Personnel Breakdown (current)
    officers INTEGER DEFAULT 0,
    ncos INTEGER DEFAULT 0,
    professional_soldiers INTEGER DEFAULT 0,
    sl_regulars INTEGER DEFAULT 0,
    
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    status VARCHAR(50),
    
    last_movement_timestamp BIGINT,
    last_communication_timestamp BIGINT,
    last_hourly_report_timestamp BIGINT,
    
    destination_lat DOUBLE PRECISION,
    destination_lon DOUBLE PRECISION,
    
    eta DOUBLE PRECISION,
    fuel_level DOUBLE PRECISION,
    ammo_level DOUBLE PRECISION,
    days_of_supply DOUBLE PRECISION,
    last_resupply_date BIGINT,
    combat_end_timestamp BIGINT,
    combat_end_lat DOUBLE PRECISION,
    combat_end_lon DOUBLE PRECISION,
    
    leave_start_date BIGINT,
    leave_duration_days INTEGER,
    retraining_start_date BIGINT,
    retraining_focus VARCHAR(255),
    retraining_duration_days INTEGER,
    
    current_mission VARCHAR(255),
    unit_situation_type VARCHAR(50),
    parent_id VARCHAR(36),
    
    -- TOE Information (authorized)
    toe_officers INTEGER DEFAULT 0,
    toe_ncos INTEGER DEFAULT 0,
    toe_prof_soldiers INTEGER DEFAULT 0,
    toe_reg_soldiers INTEGER DEFAULT 0,
    toe_civilians INTEGER DEFAULT 0,
    
    public_order_index DOUBLE PRECISION,
    criticality_level INTEGER,
    area_of_operations TEXT
);

CREATE TABLE unit_route_history (
    unit_id VARCHAR(36) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    timestamp BIGINT NOT NULL,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE unit_uav_assets (
    unit_id VARCHAR(36) NOT NULL,
    uav_id VARCHAR(100),
    uav_type VARCHAR(50),
    battery_status DOUBLE PRECISION,
    current_payload DOUBLE PRECISION,
    stream_url VARCHAR(255),
    operational_radius DOUBLE PRECISION,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE military_unit_equipment (
    military_unit_id VARCHAR(36) NOT NULL,
    equipment VARCHAR(255),
    FOREIGN KEY (military_unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE military_unit_capabilities (
    military_unit_id VARCHAR(36) NOT NULL,
    capabilities VARCHAR(255),
    FOREIGN KEY (military_unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE officer_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE nco_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE professional_soldier_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE regular_soldier_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE civilian_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE soldiers (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    rank VARCHAR(50) NOT NULL,
    moce_code VARCHAR(50) NOT NULL,
    status VARCHAR(50),
    health_status VARCHAR(50),
    legal_status VARCHAR(50),
    time_in_position INTEGER,
    estimated_retirement_date DATE,
    unit_id VARCHAR(36),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE SET NULL
);

CREATE TABLE osint_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    event_type VARCHAR(50),
    severity VARCHAR(50),
    timestamp BIGINT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    source VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE
);
