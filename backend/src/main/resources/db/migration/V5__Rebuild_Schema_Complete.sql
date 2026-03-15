-- Simcop 3.0: Definitive Total Schema Rebuild (ULTRA-PERFECT MAPPING)
-- This script drops all tables and recreates them with EXACT field matching for JPA entities.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Drop existing tables (in dependency order)
DROP TABLE IF EXISTS report_links;
DROP TABLE IF EXISTS report_keywords;
DROP TABLE IF EXISTS intelligence_report_keywords;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS professional_soldier_specialties;
DROP TABLE IF EXISTS regular_soldier_specialties;
DROP TABLE IF EXISTS civilian_specialties;
DROP TABLE IF EXISTS nco_specialties;
DROP TABLE IF EXISTS officer_specialties;
DROP TABLE IF EXISTS unit_uav_assets;
DROP TABLE IF EXISTS unit_route_history;
DROP TABLE IF EXISTS military_unit_capabilities;
DROP TABLE IF EXISTS military_unit_equipment;
DROP TABLE IF EXISTS after_action_reports;
DROP TABLE IF EXISTS intel_reports;
DROP TABLE IF EXISTS intelligence_reports;
DROP TABLE IF EXISTS fire_missions;
DROP TABLE IF EXISTS coa_plans;
DROP TABLE IF EXISTS uav_missions;
DROP TABLE IF EXISTS unit_history_events;
DROP TABLE IF EXISTS alert_viewed_by;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS soldiers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS military_units;
DROP TABLE IF EXISTS osint_events;
DROP TABLE IF EXISTS app_configuration;

-- 2. Core Tables
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    assigned_unit_id VARCHAR(36),
    telegram_chat_id VARCHAR(50)
);

CREATE TABLE user_permissions (
    user_id VARCHAR(36) NOT NULL,
    permissions VARCHAR(255),
    INDEX (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE military_units (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    commander_rank VARCHAR(50),
    commander_name VARCHAR(255),
    
    -- Personnel Breakdown (Embedded PersonnelBreakdown)
    officers INTEGER DEFAULT 0,
    ncos INTEGER DEFAULT 0,
    professional_soldiers INTEGER DEFAULT 0,
    sl_regulars INTEGER DEFAULT 0,
    
    -- GeoLocation location (Embedded)
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    status VARCHAR(50),
    last_movement_timestamp BIGINT NOT NULL DEFAULT 0,
    last_communication_timestamp BIGINT NOT NULL DEFAULT 0,
    last_hourly_report_timestamp BIGINT,
    
    -- Destination GeoLocation (Embedded with AttributeOverrides)
    destination_lat DOUBLE PRECISION,
    destination_lon DOUBLE PRECISION,
    
    eta DOUBLE PRECISION,
    fuel_level DOUBLE PRECISION,
    ammo_level DOUBLE PRECISION,
    days_of_supply DOUBLE PRECISION,
    last_resupply_date BIGINT,
    combat_end_timestamp BIGINT,
    
    -- Combat End GeoLocation (Embedded with AttributeOverrides)
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
    
    -- TOE Information (Embedded TOEInformation with Overrides)
    toe_officers INTEGER DEFAULT 0,
    toe_ncos INTEGER DEFAULT 0,
    toe_prof_soldiers INTEGER DEFAULT 0,
    toe_reg_soldiers INTEGER DEFAULT 0,
    toe_civilians INTEGER DEFAULT 0,
    
    public_order_index DOUBLE PRECISION,
    criticality_level INTEGER,
    area_of_operations TEXT
);

-- 3. Operational Tables
CREATE TABLE intelligence_reports (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    type VARCHAR(50),
    source_details VARCHAR(255),
    reliability VARCHAR(50),
    credibility VARCHAR(50),
    
    -- GeoLocation (Embedded)
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    event_timestamp BIGINT NOT NULL DEFAULT 0,
    report_timestamp BIGINT NOT NULL DEFAULT 0,
    details TEXT,
    reporting_unit_id VARCHAR(36)
);

CREATE TABLE intelligence_report_keywords (
    intelligence_report_id VARCHAR(36) NOT NULL,
    keywords VARCHAR(255),
    INDEX (intelligence_report_id),
    FOREIGN KEY (intelligence_report_id) REFERENCES intelligence_reports(id) ON DELETE CASCADE
);

CREATE TABLE report_links (
    report_id VARCHAR(36) NOT NULL,
    related_report_id VARCHAR(36),
    INDEX (report_id),
    FOREIGN KEY (report_id) REFERENCES intelligence_reports(id) ON DELETE CASCADE
);

CREATE TABLE fire_missions (
    id VARCHAR(36) PRIMARY KEY,
    requester_id VARCHAR(255),
    
    -- GeoLocation targetLocation (Embedded)
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    status VARCHAR(50),
    assigned_artillery_id VARCHAR(36),
    request_timestamp BIGINT,
    fire_timestamp BIGINT,
    completed_timestamp BIGINT,
    rejection_reason VARCHAR(255),
    projectile_type VARCHAR(50),
    charge INTEGER
);

CREATE TABLE coa_plans (
    id VARCHAR(36) PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    concept_of_operations TEXT NOT NULL,
    phases_json LONGTEXT NOT NULL,
    created_by_user_id VARCHAR(36),
    created_timestamp DATETIME NOT NULL,
    hidden_timestamp DATETIME
);

CREATE TABLE after_action_reports (
    id VARCHAR(36) PRIMARY KEY,
    unit_id VARCHAR(36),
    unit_name VARCHAR(255),
    combat_end_timestamp BIGINT,
    report_timestamp BIGINT,
    
    -- GeoLocation location (Embedded)
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    
    casualties_kia INTEGER DEFAULT 0,
    casualties_wia INTEGER DEFAULT 0,
    casualties_mia INTEGER DEFAULT 0,
    equipment_losses TEXT,
    ammunition_expended_percent DOUBLE PRECISION,
    morale VARCHAR(100),
    summary VARCHAR(2000),
    enemy_casualties_kia INTEGER,
    enemy_casualties_wia INTEGER,
    enemy_equipment_destroyed_or_captured TEXT,
    objectives_achieved TEXT,
    positive_observations TEXT,
    original_combat_alert_id VARCHAR(36)
);

CREATE TABLE unit_history_events (
    id VARCHAR(36) PRIMARY KEY,
    unit_id VARCHAR(36),
    unit_name VARCHAR(255),
    event_type VARCHAR(100),
    timestamp BIGINT,
    details VARCHAR(1000),
    
    -- GeoLocation location (Embedded)
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    
    related_entity_id VARCHAR(36),
    related_entity_type VARCHAR(100),
    user_id VARCHAR(36),
    username VARCHAR(255),
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE soldiers (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    `rank` VARCHAR(50) NOT NULL,
    moce_code VARCHAR(50) NOT NULL,
    status VARCHAR(50),
    health_status VARCHAR(50),
    legal_status VARCHAR(50),
    time_in_position INTEGER,
    estimated_retirement_date DATE,
    unit_id VARCHAR(36),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE SET NULL
);

CREATE TABLE alerts (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(50),
    unit_id VARCHAR(36),
    intel_id VARCHAR(36),
    q5_id VARCHAR(36),
    ordop_id VARCHAR(36),
    user_id VARCHAR(36),
    message TEXT,
    timestamp BIGINT NOT NULL DEFAULT 0,
    severity VARCHAR(50),
    acknowledged BOOLEAN DEFAULT FALSE,
    
    -- GeoLocation (Embedded)
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    data TEXT
);

CREATE TABLE osint_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    event_type VARCHAR(50),
    severity VARCHAR(50),
    timestamp BIGINT,
    
    -- GeoLocation (Embedded)
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    source VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE app_configuration (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at DATETIME,
    updated_by VARCHAR(100)
);

-- 4. Collection Tables
CREATE TABLE unit_route_history (
    unit_id VARCHAR(36) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    timestamp BIGINT NOT NULL,
    INDEX (unit_id),
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
    
    -- GeoLocation (Embedded)
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    
    INDEX (unit_id),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE military_unit_equipment (
    military_unit_id VARCHAR(36) NOT NULL,
    equipment VARCHAR(255),
    INDEX (military_unit_id),
    FOREIGN KEY (military_unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE military_unit_capabilities (
    military_unit_id VARCHAR(36) NOT NULL,
    capabilities VARCHAR(255),
    INDEX (military_unit_id),
    FOREIGN KEY (military_unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE officer_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    INDEX (unit_id),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE nco_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    INDEX (unit_id),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE professional_soldier_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    INDEX (unit_id),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE regular_soldier_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    INDEX (unit_id),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE civilian_specialties (
    unit_id VARCHAR(36) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255),
    quantity INTEGER,
    INDEX (unit_id),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;
