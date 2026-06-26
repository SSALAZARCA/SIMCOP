-- V11__Add_q5id_to_alerts.sql
-- Add missing q5id column to alerts table
ALTER TABLE alerts ADD COLUMN q5id VARCHAR(255);
