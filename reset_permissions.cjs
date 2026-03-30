const mysql = require('mysql2/promise');

if (!process.env.DB_PASSWORD) {
    console.error('Error: DB_PASSWORD environment variable must be set.');
    process.exit(1);
}


async function resetPermissions() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'srv1196.hstgr.io',
            user: process.env.DB_USER || 'u689528678_SIMCOP',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'u689528678_SIMCOP'
        });

        console.log('✅ Conectado a la base de datos MySQL');

        const userId = 2; // santiago.salazar

        // Borrar permisos existentes para evitar conflictos
        await connection.execute(
            'DELETE FROM user_permissions WHERE user_id = ?',
            [userId]
        );

        console.log('✅ Permisos eliminados para usuario ID 2');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

resetPermissions();
