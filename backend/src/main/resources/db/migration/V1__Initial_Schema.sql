-- Initial schema for Simcop 3.0
-- Created on 2026-01-27

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    permissions TEXT[],
    assigned_unit_id VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS military_units (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    parent_id VARCHAR(36),
    commander_name VARCHAR(255),
    commander_rank VARCHAR(50),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    status VARCHAR(50),
    unit_situation_type VARCHAR(50),
    ammo_level INTEGER,
    days_of_supply INTEGER,
    last_communication_timestamp BIGINT
);
