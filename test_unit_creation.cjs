const http = require('http');

const unitWithId = JSON.stringify({
    id: "some-random-id-" + Date.now(),
    name: "Test Unit With ID " + Date.now(),
    type: "Pelotón",
    commander: { rank: "CT.", name: "Test Commander" },
    personnelBreakdown: { officers: 1, ncos: 3, professionalSoldiers: 20, slRegulars: 10 },
    location: { lat: 1.0, lon: -70.0 },
    status: "Operacional",
    lastMovementTimestamp: Date.now(),
    lastCommunicationTimestamp: Date.now(),
    routeHistory: [],
    unitSituationType: "ORGANICA"
});

const unitWithoutId = JSON.stringify({
    name: "Test Unit Without ID " + Date.now(),
    type: "Pelotón",
    commander: { rank: "CT.", name: "Test Commander NoID" },
    personnelBreakdown: { officers: 1, ncos: 3, professionalSoldiers: 20, slRegulars: 10 },
    location: { lat: 1.0, lon: -70.0 },
    status: "Operacional",
    lastMovementTimestamp: Date.now(),
    lastCommunicationTimestamp: Date.now(),
    routeHistory: [],
    unitSituationType: "ORGANICA"
});

function postUnit(unitData, label) {
    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/units',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(unitData)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`[${label}] Status: ${res.statusCode}`);
            console.log(`[${label}] Response: ${data}`);
        });
    });

    req.on('error', (e) => {
        console.error(`[${label}] Error: ${e.message}`);
    });

    req.write(unitData);
    req.end();
}

console.log("Testing Unit Creation...");
postUnit(unitWithId, "WITH_ID");
setTimeout(() => {
    postUnit(unitWithoutId, "WITHOUT_ID");
}, 1000);
