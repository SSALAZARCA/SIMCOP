const http = require('http');

async function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

async function testPersistence() {
    console.log("🚀 Starting Persistence Test...");

    // 1. Login
    console.log("🔑 Logging in as santiago.salazar...");
    const loginRes = await request({
        hostname: 'localhost',
        port: 5005,
        path: '/api/users/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { username: 'santiago.salazar', hashedPassword: 'ssc841209' });

    if (loginRes.statusCode !== 200) {
        console.error("❌ Login failed:", loginRes.body);
        return;
    }

    const authData = JSON.parse(loginRes.body);
    const token = authData.token;
    console.log("✅ Logged in successfully.");

    // 2. Create Unit
    const unitName = "TEST_UNIT_" + Date.now();
    console.log(`📦 Creating unit: ${unitName}...`);
    const createRes = await request({
        hostname: 'localhost',
        port: 5005,
        path: '/api/units',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }, {
        name: unitName,
        type: "BATTALION",
        commander: { rank: "TC.", name: "Test Commander" },
        personnelBreakdown: { officers: 10, ncos: 50, professionalSoldiers: 300, slRegulars: 100 },
        location: { lat: 4.6097, lon: -74.0817 },
        status: "OPERATIONAL",
        unitSituationType: "ORGANICA"
    });

    if (createRes.statusCode !== 200) {
        console.error("❌ Create failed:", createRes.statusCode, createRes.body);
        return;
    }
    const createdUnit = JSON.parse(createRes.body);
    console.log("✅ Unit created with ID:", createdUnit.id);

    // 3. List Units and Verify
    console.log("🔍 Verifying unit in list...");
    const listRes = await request({
        hostname: 'localhost',
        port: 5005,
        path: '/api/units',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (listRes.statusCode !== 200) {
        console.error("❌ List failed:", listRes.statusCode, listRes.body);
        return;
    }

    const units = JSON.parse(listRes.body);
    const found = units.find(u => u.name === unitName);

    if (found) {
        console.log("✅ Unit found in list. Verification SUCCESS.");
    } else {
        console.error("❌ Unit NOT found in list. Persistence issue confirmed!");
        console.log("Current units in DB context:", units.map(u => u.name));
    }
}

testPersistence().catch(console.error);
