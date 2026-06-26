async function debugUpdateUser() {
    const userId = 2; // santiago.salazar
    const url = `http://localhost:8080/api/users/${userId}`;

    const payload = {
        displayName: "Santiago Salazar",
        role: "ADMINISTRATOR",
        permissions: ["DASHBOARD", "MAP", "PERSONNEL", "UNITS", "INTEL"],
        assignedUnitId: null
    };

    console.log(`Sending PUT to ${url}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`\nResponse Status: ${response.status} ${response.statusText}`);

        const text = await response.text();
        console.log('Response Body:', text);

        if (!response.ok) {
            console.log('❌ Request failed');
        } else {
            console.log('✅ Request successful');
        }

    } catch (error) {
        console.error('❌ Network/Script Error:', error.message);
    }
}

debugUpdateUser();
