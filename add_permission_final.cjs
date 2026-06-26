const mysql = require('mysql2/promise');

async function addPermission() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'srv1196.hstgr.io',
            user: 'u689528678_SIMCOP',
            password: 'Ssc841209*',
            database: 'u689528678_SIMCOP'
        });

        console.log('✅ Conectado a la base de datos MySQL');

        // Intentar con user_permissions (nombre por defecto JPA si la entidad es User)
        // O users_permissions (si toma el nombre de la tabla users)

        const userId = 2; // santiago.salazar
        const permission = 'PERSONNEL';

        // Verificar si existe la tabla user_permissions
        const [tables] = await connection.execute("SHOW TABLES LIKE 'user_permissions'");
        let tableName = 'user_permissions';

        if (tables.length === 0) {
            const [tables2] = await connection.execute("SHOW TABLES LIKE 'users_permissions'");
            if (tables2.length > 0) {
                tableName = 'users_permissions';
            } else {
                console.log('❌ No se encontró la tabla de permisos (ni user_permissions ni users_permissions)');
                return;
            }
        }

        console.log(`Using table: ${tableName}`);

        // Verificar si ya tiene el permiso
        const [existing] = await connection.execute(
            `SELECT * FROM ${tableName} WHERE user_id = ? AND permissions = ?`,
            [userId, permission]
        );

        if (existing.length > 0) {
            console.log(`✅ El usuario ya tiene el permiso ${permission}`);
        } else {
            // Insertar permiso
            await connection.execute(
                `INSERT INTO ${tableName} (user_id, permissions) VALUES (?, ?)`,
                [userId, permission]
            );
            console.log(`✅ Permiso ${permission} agregado exitosamente a ${tableName}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addPermission();
