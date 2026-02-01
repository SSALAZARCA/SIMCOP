import fetch from 'node-fetch';

const API_URL = 'http://localhost:8080/api/users';

const createOrUpdateAdmin = async () => {
    try {
        // 1. Fetch all users to find existing one
        const response = await fetch(API_URL);
        const users = await response.json();

        const adminUser = users.find(u => u.username === 'santiago.salazar');

        const userData = {
            username: 'santiago.salazar',
            displayName: 'Santiago Salazar',
            hashedPassword: 'password123', // This will be encoded by the backend
            role: 'ADMINISTRATOR',
            permissions: [
                'Panel Principal', 'Unidades', 'Inteligencia', 'Alertas', 'Análisis',
                'Comunicaciones', 'Artillería y Observación', 'Gestión UAV / Aéreo', 'Histórico AAR', 'Reportes Q5',
                'Permiso/Reentrenamiento', 'Histórico Eventos', 'INSITOP', 'SPOT Seguimiento',
                'Órdenes de Operaciones', 'Estructura de Fuerza', 'Logística', 'Mapa', 'Personal',
                'Algoritmo de Gestión de Batalla (BMA)', 'Gestión de Usuarios', 'Configuración'
            ],
            assignedUnitId: null
        };

        if (adminUser) {
            console.log('User santiago.salazar exists. Updating password and permissions via POST (Encodes password)...');
            userData.id = adminUser.id; // Preserve ID to update

            // Using POST to /api/users (createUser) because it contains the logic to ENCODE the password.
            // PUT /api/users/{id} DOES NOT encode the password in the current controller logic.
            const updateRes = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            console.log('Update status:', updateRes.status);
            const text = await updateRes.text();
            console.log('Update response:', text);
        } else {
            console.log('User santiago.salazar does not exist. Creating via POST...');
            const createRes = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            console.log('Create status:', createRes.status);
            const text = await createRes.text();
            console.log('Create response:', text);
        }

    } catch (e) {
        console.error('Error:', e);
    }
};

createOrUpdateAdmin();
