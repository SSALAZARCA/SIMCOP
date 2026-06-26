const mysql = require('mysql2/promise');

async function addPersonnelPermission() {
    let connection;
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: 'srv1196.hstgr.io',
            user: 'u689528678_SIMCOP',
            password: 'Ssc841209*',
            database: 'u689528678_SIMCOP'
        });

        console.log('✅ Conectado a la base de datos MySQL');

        // Obtener permisos actuales
        const [rows] = await connection.execute(
            'SELECT id, username, role, permissions FROM users WHERE username = ?',
            ['santiago.salazar']
        );

        if (rows.length === 0) {
            console.log('❌ Usuario santiago.salazar no encontrado');
            return;
        }

        const user = rows[0];
        console.log('\n--- Usuario Actual ---');
        console.log('ID:', user.id);
        console.log('Username:', user.username);
        console.log('Role:', user.role);
        console.log('Permisos actuales:', user.permissions);

        // Parsear permisos
        let permissions = [];
        if (typeof user.permissions === 'string') {
            try {
                permissions = JSON.parse(user.permissions);
            } catch (e) {
                permissions = user.permissions.split(',').map(p => p.trim());
            }
        } else if (Array.isArray(user.permissions)) {
            permissions = user.permissions;
        }

        // Verificar si ya tiene PERSONNEL
        if (permissions.includes('PERSONNEL')) {
            console.log('\n✅ El usuario ya tiene el permiso PERSONNEL');
        } else {
            // Agregar PERSONNEL
            permissions.push('PERSONNEL');
            const permissionsJson = JSON.stringify(permissions);

            // Actualizar en la base de datos
            await connection.execute(
                'UPDATE users SET permissions = ? WHERE username = ?',
                [permissionsJson, 'santiago.salazar']
            );

            console.log('\n✅ Permiso PERSONNEL agregado exitosamente!');
            console.log('Nuevos permisos:', permissions);
        }

        // Verificar resultado final
        const [finalRows] = await connection.execute(
            'SELECT username, role, permissions FROM users WHERE username = ?',
            ['santiago.salazar']
        );

        console.log('\n--- Estado Final ---');
        console.log('Username:', finalRows[0].username);
        console.log('Role:', finalRows[0].role);
        console.log('Permisos:', finalRows[0].permissions);

        console.log('\n✅ Proceso completado. Refresca la aplicación (F5) para ver el módulo Personal en el sidebar.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addPersonnelPermission();
