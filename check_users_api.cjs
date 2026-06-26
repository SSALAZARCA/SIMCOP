const fetch = require('node-fetch');

async function checkUsersEndpoint() {
    try {
        console.log('Fetching users from http://localhost:8080/api/users...');
        const response = await fetch('http://localhost:8080/api/users');

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Is Array?', Array.isArray(data));
        console.log('Length:', Array.isArray(data) ? data.length : 'N/A');
        console.log('Data sample:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Fetch error:', error.message);
    }
}

checkUsersEndpoint();
