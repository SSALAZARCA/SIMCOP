CREATE TABLE IF NOT EXISTS specialty_catalog (
    id VARCHAR(255) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(500)
);
