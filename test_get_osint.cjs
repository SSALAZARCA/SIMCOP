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
        }, JSON.stringify({ username: 'santiago.salazar', password: 'password' }));
        
        if (loginRes.status !== 200) { console.error('Login failed:', loginRes.data); return; }
        const token = JSON.parse(loginRes.data).token;
        console.log('Got token.');

        console.log('Fetching OSINT events...');
        const getRes = await request({
            hostname: 'localhost', port: 8080, path: '/api/osint/events', method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const events = JSON.parse(getRes.data);
        console.log('Found events:', events.length);
        for(const e of events) {
            console.log(e.title);
            console.log(`LAT: ${e.location.lat} | LON: ${e.location.lon}`);
            console.log(`URL: ${e.sourceUrl}`);
            console.log('----------------');
        }
    } catch(e) {
        console.error(e);
    }
}
run();
