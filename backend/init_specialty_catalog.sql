-- Drop table if exists to start fresh
DROP TABLE IF EXISTS specialty_catalog;

-- Create specialty_catalog table
CREATE TABLE specialty_catalog (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some sample data for testing
INSERT INTO specialty_catalog (id, code, name, category, description) VALUES
(UUID(), '11B', 'Infantería', 'professionalSoldiers', 'Especialidad de infantería básica'),
(UUID(), '19D', 'Caballería Blindada', 'professionalSoldiers', 'Operador de vehículos blindados'),
(UUID(), '31B', 'Policía Militar', 'professionalSoldiers', 'Policía militar y seguridad');
