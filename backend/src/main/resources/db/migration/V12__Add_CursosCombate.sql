DROP PROCEDURE IF EXISTS add_cursos_combate_if_not_exists;

CREATE PROCEDURE add_cursos_combate_if_not_exists()
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'soldiers'
          AND COLUMN_NAME = 'cursos_combate'
    ) THEN
        ALTER TABLE soldiers ADD COLUMN cursos_combate VARCHAR(255);
    END IF;
END;

CALL add_cursos_combate_if_not_exists();

DROP PROCEDURE add_cursos_combate_if_not_exists;
