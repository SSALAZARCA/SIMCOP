import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbConfig = {
    host: '127.0.0.1', // Change to your database host
    user: 'root',      // Change to your database user
    password: 'password', // Change to your database password
    database: 'simcop' // Change to your database name
};

async function updatePassword(username, plainTextPassword) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log(`Connected to database. Hashing password for user '${username}'...`);

        // Generate BCrypt hash
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);

        // Update user
        const [result] = await connection.execute(
            'UPDATE users SET hashed_password = ?, role = "ADMINISTRATOR" WHERE username = ?',
            [hashedPassword, username]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ Successfully updated password and role for ${username}`);
        } else {
            console.log(`❌ User '${username}' not found in database. Make sure the user exists first.`);
        }

        await connection.end();
    } catch (err) {
        console.error('Database error:', err);
    }
}

// Ensure you run `npm install mysql2 bcryptjs` before executing this script
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node update_admin_password.js <username> <new_password>");
} else {
    updatePassword(args[0], args[1]);
}
