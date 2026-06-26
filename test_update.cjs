const http = require('http');

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    try {
        console.log('Logging in...');
        const loginRes = await request({
            hostname: 'localhost', port: 8080, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({ username: 'admin', password: 'password' }));
        
        if (loginRes.status !== 200) { console.error('Login failed:', loginRes); return; }
        const token = JSON.parse(loginRes.data).token;
        console.log('Got token.');

        console.log('Fetching units...');
        const getRes = await request({
            hostname: 'localhost', port: 8080, path: '/api/units', method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const units = JSON.parse(getRes.data);
        if (units.length === 0) { console.log('No units found.'); return; }
        
        const unit = units[0];
        console.log('Updating unit:', unit.id);
        
        unit.routeHistory = unit.routeHistory || [];
        unit.routeHistory.push({ lat: 4.5, lon: -74.0, timestamp: Date.now() });
        unit.location = { lat: 4.5, lon: -74.0 };

        const putRes = await request({
            hostname: 'localhost', port: 8080, path: '/api/units/' + unit.id, method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        }, JSON.stringify(unit));

        console.log('PUT Response Status:', putRes.status);
        
        const get2Res = await request({
            hostname: 'localhost', port: 8080, path: '/api/units', method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const updatedUnits = JSON.parse(get2Res.data);
        const updatedUnit = updatedUnits.find(u => u.id === unit.id);
        console.log('Route History Length after GET:', updatedUnit.routeHistory.length);
        console.log('Route History:', JSON.stringify(updatedUnit.routeHistory));
    } catch(e) {
        console.error(e);
    }
}
run();
