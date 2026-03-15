-- V8__Complete_Model_Sync_Final.sql
-- Definitive reconstruction of ALL tables to match SIMCOP 3.0 Java Entities.
-- This script fixes missing tables, naming mismatches, and data type inconsistencies.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DROP ALL TABLES (to ensure a fresh state for models that changed significantly)
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
DROP TABLE IF EXISTS fire_missions;
DROP TABLE IF EXISTS coa_plans;
DROP TABLE IF EXISTS uav_missions;
DROP TABLE IF EXISTS unit_history_events;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS soldiers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS military_units;
DROP TABLE IF EXISTS osint_events;
DROP TABLE IF EXISTS app_configuration;
DROP TABLE IF EXISTS logistics_requests;
DROP TABLE IF EXISTS q5_reports;
DROP TABLE IF EXISTS artillery_pieces;
DROP TABLE IF EXISTS artillery_ammo;
DROP TABLE IF EXISTS forward_observers;
DROP TABLE IF EXISTS operational_graphics;
DROP TABLE IF EXISTS operations_orders;
DROP TABLE IF EXISTS operations_order_recipient_user_ids;
DROP TABLE IF EXISTS operations_order_acknowledgements;

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

CREATE TABLE app_configuration (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at DATETIME,
    updated_by VARCHAR(100)
);

CREATE TABLE military_units (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    commander_rank VARCHAR(50),
    commander_name VARCHAR(255),
    officers INTEGER DEFAULT 0,
    ncos INTEGER DEFAULT 0,
    professional_soldiers INTEGER DEFAULT 0,
    sl_regulars INTEGER DEFAULT 0,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    status VARCHAR(50),
    last_movement_timestamp BIGINT NOT NULL DEFAULT 0,
    last_communication_timestamp BIGINT NOT NULL DEFAULT 0,
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
    toe_officers INTEGER DEFAULT 0,
    toe_ncos INTEGER DEFAULT 0,
    toe_prof_soldiers INTEGER DEFAULT 0,
    toe_reg_soldiers INTEGER DEFAULT 0,
    toe_civilians INTEGER DEFAULT 0,
    public_order_index DOUBLE PRECISION,
    criticality_level INTEGER,
    area_of_operations TEXT
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

-- 3. Operational & Intelligence Tables
CREATE TABLE intelligence_reports (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    type VARCHAR(50),
    source_details VARCHAR(255),
    reliability VARCHAR(50),
    credibility VARCHAR(50),
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    event_timestamp BIGINT NOT NULL DEFAULT 0,
    report_timestamp BIGINT NOT NULL DEFAULT 0,
    details TEXT,
    reporting_unit_id VARCHAR(36)
);

CREATE TABLE osint_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    summary TEXT,
    source_url VARCHAR(255),
    source_name VARCHAR(255),
    location_name VARCHAR(255),
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    event_timestamp DATETIME,
    processed_timestamp DATETIME,
    confidence_score DOUBLE PRECISION,
    event_type VARCHAR(50),
    verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE fire_missions (
    id VARCHAR(36) PRIMARY KEY,
    requester_id VARCHAR(255),
    target_location_lat DOUBLE PRECISION,
    target_location_lon DOUBLE PRECISION,
    status VARCHAR(50),
    assigned_artillery_id VARCHAR(36),
    request_timestamp BIGINT,
    fire_timestamp BIGINT,
    completed_timestamp BIGINT,
    rejection_reason VARCHAR(255),
    projectile_type VARCHAR(50),
    charge INTEGER
);

CREATE TABLE uav_missions (
    id VARCHAR(36) PRIMARY KEY,
    requester_unit_id VARCHAR(36),
    drone_unit_id VARCHAR(36),
    drone_asset_id VARCHAR(36),
    target_lat DOUBLE PRECISION,
    target_lon DOUBLE PRECISION,
    type VARCHAR(50),
    status VARCHAR(50),
    timestamp BIGINT,
    details TEXT
);

CREATE TABLE logistics_requests (
    id VARCHAR(36) PRIMARY KEY,
    originating_unit_id VARCHAR(36),
    originating_unit_name VARCHAR(255),
    details TEXT,
    request_timestamp BIGINT,
    status VARCHAR(50),
    fulfilled_timestamp BIGINT,
    fulfilled_by_user_id VARCHAR(36),
    related_alert_id VARCHAR(36)
);

CREATE TABLE q5_reports (
    id VARCHAR(36) PRIMARY KEY,
    aar_id VARCHAR(36),
    unit_id VARCHAR(36),
    unit_name VARCHAR(255),
    report_timestamp BIGINT,
    que TEXT,
    quien TEXT,
    cuando TEXT,
    donde TEXT,
    hechos TEXT,
    acciones_subsiguientes TEXT
);

CREATE TABLE artillery_pieces (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(50),
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    status VARCHAR(50),
    min_range DOUBLE PRECISION,
    max_range DOUBLE PRECISION,
    assigned_unit_id VARCHAR(36),
    commander_id VARCHAR(36),
    director_tiro_id VARCHAR(36)
);

CREATE TABLE forward_observers (
    id VARCHAR(36) PRIMARY KEY,
    callsign VARCHAR(255),
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    status VARCHAR(50),
    assigned_unit_id VARCHAR(36),
    commander_id VARCHAR(36)
);

CREATE TABLE operational_graphics (
    id VARCHAR(36) PRIMARY KEY,
    plantilla_type VARCHAR(255) NOT NULL,
    graphic_type VARCHAR(255) NOT NULL,
    geo_json LONGTEXT NOT NULL,
    label VARCHAR(255),
    created_by_user_id VARCHAR(36),
    created_timestamp DATETIME NOT NULL,
    hidden_timestamp DATETIME
);

CREATE TABLE operations_orders (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    status VARCHAR(50),
    classification VARCHAR(50),
    issued_timestamp BIGINT,
    effective_timestamp BIGINT,
    issuing_authority VARCHAR(255),
    situation_enemy_forces TEXT,
    situation_friendly_forces TEXT,
    situation_aggregations_and_segregations TEXT,
    situation_operational_environment TEXT,
    situation_civil_population TEXT,
    mission TEXT,
    execution_concept_of_operations TEXT,
    execution_tasks_maneuver_units TEXT,
    execution_tasks_combat_support_units TEXT,
    execution_coordination_instructions TEXT,
    sustainment_supplies TEXT,
    sustainment_transportation TEXT,
    sustainment_medical TEXT,
    sustainment_personnel TEXT,
    sustainment_others TEXT,
    command_and_signal_command_commander_location TEXT,
    command_and_signal_command_command_posts TEXT,
    command_and_signal_command_chain_of_command TEXT,
    command_and_signal_communications_frequencies_and_callsigns TEXT,
    command_and_signal_communications_radio_procedures TEXT,
    command_and_signal_communications_pyrotechnics_and_signals TEXT,
    command_and_signal_communications_challenge_and_response TEXT
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
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    data TEXT
);

CREATE TABLE unit_history_events (
    id VARCHAR(36) PRIMARY KEY,
    unit_id VARCHAR(36),
    unit_name VARCHAR(255),
    event_type VARCHAR(100),
    timestamp BIGINT,
    details TEXT,
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
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    casualties_kia INTEGER DEFAULT 0,
    casualties_wia INTEGER DEFAULT 0,
    casualties_mia INTEGER DEFAULT 0,
    equipment_losses TEXT,
    ammunition_expended_percent DOUBLE PRECISION,
    morale VARCHAR(100),
    summary TEXT,
    enemy_casualties_kia INTEGER,
    enemy_casualties_wia INTEGER,
    enemy_equipment_destroyed_or_captured TEXT,
    objectives_achieved TEXT,
    positive_observations TEXT,
    original_combat_alert_id VARCHAR(36)
);

-- 4. Collection / Support Tables
CREATE TABLE user_permissions (
    user_id VARCHAR(36) NOT NULL,
    permissions VARCHAR(255),
    INDEX (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE unit_route_history (
    unit_id VARCHAR(36) NOT NULL,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lon DOUBLE PRECISION NOT NULL,
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
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    INDEX (unit_id),
    FOREIGN KEY (unit_id) REFERENCES military_units(id) ON DELETE CASCADE
);

CREATE TABLE artillery_ammo (
    artillery_id VARCHAR(36) NOT NULL,
    type VARCHAR(50),
    quantity INTEGER,
    INDEX (artillery_id),
    FOREIGN KEY (artillery_id) REFERENCES artillery_pieces(id) ON DELETE CASCADE
);

CREATE TABLE operations_order_recipient_user_ids (
    operations_order_id VARCHAR(36) NOT NULL,
    recipient_user_ids VARCHAR(36),
    INDEX (operations_order_id),
    FOREIGN KEY (operations_order_id) REFERENCES operations_orders(id) ON DELETE CASCADE
);

CREATE TABLE operations_order_acknowledgements (
    operations_order_id VARCHAR(36) NOT NULL,
    acknowledgements VARCHAR(255),
    INDEX (operations_order_id),
    FOREIGN KEY (operations_order_id) REFERENCES operations_orders(id) ON DELETE CASCADE
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

SET FOREIGN_KEY_CHECKS = 1;
