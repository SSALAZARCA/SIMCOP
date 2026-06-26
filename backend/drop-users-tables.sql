-- Script to drop the users table and related tables
-- This will allow Hibernate to recreate them with the correct schema

DROP TABLE IF EXISTS users_permissions;
DROP TABLE IF EXISTS users;
