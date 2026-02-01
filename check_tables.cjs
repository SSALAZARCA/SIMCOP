const mysql = require('mysql2/promise');

async function checkTables() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'srv1196.hstgr.io',
            user: 'u689528678_SIMCOP',
            password: 'Ssc841209*',
            database: 'u689528678_SIMCOP'
        });

        console.log('✅ Conectado a la base de datos MySQL\n');

        // Listar tablas
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('--- Tablas en la base de datos ---');
        tables.forEach(row => {
            console.log(Object.values(row)[0]);
        });

        // Si encontramos una tabla de permisos, ver su estructura
        const permissionTable = tables.find(row => {
            const name = Object.values(row)[0].toLowerCase();
            return name.includes('permission');
        });

        if (permissionTable) {
            const tableName = Object.values(permissionTable)[0];
            console.log(`\n--- Estructura de ${tableName} ---`);
            const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
            columns.forEach(col => {
                console.log(`${col.Field} (${col.Type})`);
            });

            // Ver contenido para el usuario
            console.log(`\n--- Permisos para usuario ID 2 (santiago.salazar) ---`);
            // Asumiendo que la columna de FK es User_id o user_id
            try {
                const [perms] = await connection.execute(`SELECT * FROM ${tableName} WHERE User_id = 2 OR user_id = 2`);
                console.log(perms);
            } catch (e) {
                console.log("No se pudo consultar por ID 2: " + e.message);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTables();
