-- V11__Add_q5id_to_alerts.sql
-- Add missing q5id column to alerts table
DROP PROCEDURE IF EXISTS add_q5id_if_not_exists;

DELIMITER $$

CREATE PROCEDURE add_q5id_if_not_exists()
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'alerts'
          AND COLUMN_NAME = 'q5id'
    ) THEN
        ALTER TABLE alerts ADD COLUMN q5id VARCHAR(255);
    END IF;
END $$

DELIMITER ;

CALL add_q5id_if_not_exists();
DROP PROCEDURE add_q5id_if_not_exists;
