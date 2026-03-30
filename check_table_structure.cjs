const mysql = require('mysql2/promise');

if (!process.env.DB_PASSWORD) {
    console.error('Error: DB_PASSWORD environment variable must be set.');
    process.exit(1);
}


async function checkTableStructure() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'srv1196.hstgr.io',
            user: process.env.DB_USER || 'u689528678_SIMCOP',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'u689528678_SIMCOP'
        });

        console.log('✅ Conectado a la base de datos MySQL\n');

        // Ver estructura de la tabla users
        const [columns] = await connection.execute('DESCRIBE users');

        console.log('--- Estructura de la tabla users ---');
        columns.forEach(col => {
            console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Ver un usuario de ejemplo
        const [users] = await connection.execute('SELECT * FROM users LIMIT 1');
        console.log('\n--- Ejemplo de usuario ---');
        if (users.length > 0) {
            console.log(JSON.stringify(users[0], null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTableStructure();
