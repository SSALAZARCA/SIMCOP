-- Script SQL para agregar permiso PERSONNEL a usuario santiago.salazar
-- Ejecutar este script en tu base de datos PostgreSQL

-- Agregar permiso PERSONNEL al usuario santiago.salazar
UPDATE users 
SET permissions = array_append(permissions, 'PERSONNEL')
WHERE username = 'santiago.salazar' 
  AND NOT ('PERSONNEL' = ANY(permissions));

-- Verificar que se agregó correctamente
SELECT username, role, permissions 
FROM users 
WHERE username = 'santiago.salazar';
