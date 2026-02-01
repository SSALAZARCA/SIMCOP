import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

const createUnit = async (unit) => {
    try {
        const response = await fetch(`${BASE_URL}/units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(unit)
        });
        if (!response.ok) {
            console.error(`Error creating unit ${unit.name}: ${response.status} ${await response.text()}`);
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error(`Network error creating unit ${unit.name}: ${e.message}`);
        return null;
    }
};

const createArtilleryPiece = async (piece) => {
    try {
        const response = await fetch(`${BASE_URL}/artillery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(piece)
        });
        if (!response.ok) {
            console.error(`Error creating artillery piece ${piece.name}: ${response.status} ${await response.text()}`);
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error(`Network error creating artillery piece ${piece.name}: ${e.message}`);
        return null;
    }
};

const assignUAV = async (unitId, asset) => {
    try {
        // UAVController.java: assignAsset(@RequestParam String unitId, @RequestBody UAVAsset asset)
        // Endpoint: /api/uav/assign-asset?unitId=...
        const response = await fetch(`${BASE_URL}/uav/assign-asset?unitId=${unitId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset)
        });
        if (!response.ok) {
            console.error(`Error assigning UAV to ${unitId}: ${response.status} ${await response.text()}`);
            return false;
        }
        return true;
    } catch (e) {
        console.error(`Network error assigning UAV: ${e.message}`);
        return false;
    }
};

const run = async () => {
    console.log('--- ENHANCING 8TH DIVISION STRUCTURE (PLATOONS, ARTILLERY, UAVS) ---');

    // Assumes higher-level units (Div, Brigades, Battalions) already exist or we need to recreate them
    // For safety, let's just make sure "BA-18" and "BI-44" and "GM-16" exist by trusting the IDs used previously.
    // If previous script ran, IDs are "BI-44", "GM-16", "BA-18".

    // 1. PLATOONS FOR BATALLÓN DE INFANTERÍA NO. 44 (BI-44)
    const platoonsBI44 = [
        { id: "BI44-PL1", name: "1ER PELOTÓN - CONDOR", type: "PLATOON", parentId: "BI-44", location: { lat: 4.9530, lon: -72.7540 }, commander: { rank: "ST.", name: "JUAN VALDEZ" }, personnelBreakdown: { officers: 1, ncos: 4, professionalSoldiers: 30, slRegulars: 6 }, status: "OPERATIONAL", unitSituationType: "ORGANICA" },
        { id: "BI44-PL2", name: "2DO PELOTÓN - AGUILA", type: "PLATOON", parentId: "BI-44", location: { lat: 4.9510, lon: -72.7520 }, commander: { rank: "ST.", name: "CARLOS PEREZ" }, personnelBreakdown: { officers: 1, ncos: 4, professionalSoldiers: 30, slRegulars: 6 }, status: "OPERATIONAL", unitSituationType: "ORGANICA" },
        { id: "BI44-PL3", name: "3ER PELOTÓN - HALCON", type: "PLATOON", parentId: "BI-44", location: { lat: 4.9525, lon: -72.7535 }, commander: { rank: "ST.", name: "LUIS LOPEZ" }, personnelBreakdown: { officers: 1, ncos: 4, professionalSoldiers: 30, slRegulars: 6 }, status: "OPERATIONAL", unitSituationType: "ORGANICA" }
    ];

    for (const p of platoonsBI44) {
        await createUnit(p);
    }

    // 2. DRONE TEAMS / ASSETS
    // Create a specific "Pelotón de Drones" under GM-16 (Cavalry usually has reconnaissance)
    const dronePlatoon = { id: "GM16-UAV", name: "PELOTÓN DE VIGILANCIA AÉREA (UAV)", type: "PLATOON", parentId: "GM-16", location: { lat: 5.3210, lon: -72.3810 }, commander: { rank: "ST.", name: "ANA MARTINEZ" }, personnelBreakdown: { officers: 1, ncos: 3, professionalSoldiers: 12, slRegulars: 0 }, status: "OPERATIONAL", unitSituationType: "ORGANICA" };

    await createUnit(dronePlatoon);

    // Assign UAV Assets to this platoon
    // UAVAsset structure: { id, model, type, batteryLevel, status, rangeKm, operationalCeilingM }
    // Controller expects UAVAsset object in body.
    await assignUAV("GM16-UAV", {
        id: "UAV-RAVEN-01",
        model: "RQ-11 Raven",
        type: "TACTICAL", // Assuming enum match or string
        batteryLevel: 100,
        status: "AVAILABLE",
        rangeKm: 10,
        operationalCeilingM: 150
    });

    await assignUAV("GM16-UAV", {
        id: "UAV-SCAN-01",
        model: "ScanEagle",
        type: "TACTICAL",
        batteryLevel: 95,
        status: "AVAILABLE",
        rangeKm: 100,
        operationalCeilingM: 5000
    });

    // 3. ARTILLERY PIECES FOR BA-18
    // ArtilleryPiece structure: { id, name, type (Enum), status (Enum), maxRangeMeters, currentLocation: {lat, lon}, assignedUnitId }
    // Enum Types likely: HOWITZER, MORTAR, MLRS

    const obus1 = {
        id: "ART-105-01",
        name: "OBUS 105MM - TRUENO 1",
        type: "HOWITZER",
        status: "AVAILABLE",
        maxRangeMeters: 11000,
        currentLocation: { lat: 7.0810, lon: -70.7510 },
        assignedUnitId: "BA-18"
    };

    const obus2 = {
        id: "ART-105-02",
        name: "OBUS 105MM - TRUENO 2",
        type: "HOWITZER",
        status: "AVAILABLE",
        maxRangeMeters: 11000,
        currentLocation: { lat: 7.0820, lon: -70.7520 },
        assignedUnitId: "BA-18"
    };

    // Add a Mortar platoon to BI-24
    const mortarUnit = { id: "BI24-MORT", name: "PELOTÓN DE MORTEROS 81MM", type: "PLATOON", parentId: "BI-24", location: { lat: 7.0330, lon: -71.2730 }, commander: { rank: "SS.", name: "OSCAR RUIZ" }, status: "OPERATIONAL", unitSituationType: "ORGANICA" };
    await createUnit(mortarUnit);

    const mortero1 = {
        id: "MORT-81-01",
        name: "MORTERO 81MM - ALFA",
        type: "MORTAR",
        status: "AVAILABLE",
        maxRangeMeters: 5000,
        currentLocation: { lat: 7.0330, lon: -71.2730 },
        assignedUnitId: "BI24-MORT"
    };

    await createArtilleryPiece(obus1);
    await createArtilleryPiece(obus2);
    await createArtilleryPiece(mortero1);

    console.log('--- ENHANCEMENT COMPLETED ---');
};

run();
