CREATE TABLE osint_events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    source_url VARCHAR(255) UNIQUE,
    source_name VARCHAR(255),
    location_name VARCHAR(255),
    lat DOUBLE,
    lon DOUBLE,
    event_timestamp DATETIME,
    processed_timestamp DATETIME,
    confidence_score DOUBLE,
    event_type VARCHAR(50),
    verified BIT(1) DEFAULT 0
);
