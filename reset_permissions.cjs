const mysql = require('mysql2/promise');

async function resetPermissions() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'srv1196.hstgr.io',
            user: 'u689528678_SIMCOP',
            password: 'Ssc841209*',
            database: 'u689528678_SIMCOP'
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
