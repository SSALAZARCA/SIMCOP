// const fetch = require('node-fetch'); // Native fetch in Node 18+

async function checkPermissions() {
    try {
        const response = await fetch('http://localhost:8080/api/users');
        const users = await response.json();

        console.log(`Found ${users.length} users.`);

        users.forEach(user => {
            console.log(`User: ${user.username} (ID: ${user.id})`);
            console.log(`Role: ${user.role}`);
            console.log(`Permissions (${user.permissions ? user.permissions.length : 0}):`, user.permissions);
            console.log('---');
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPermissions();
