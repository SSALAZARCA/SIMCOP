import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

const createUnit = async (unit) => {
    const res = await fetch(`${BASE_URL}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unit)
    });
    if (!res.ok) throw new Error(`Failed to create ${unit.name}: ${await res.text()}`);
    return await res.json();
};

const run = async () => {
    try {
        console.log("--- STARTING MASTER SEED ---");

        // 1. DELETE ALL existing units to avoid mess
        const existingUnitsRes = await fetch(`${BASE_URL}/units`);
        const existingUnits = await existingUnitsRes.json();
        console.log(`Deleting ${existingUnits.length} existing units...`);
        for (const u of existingUnits) {
            await fetch(`${BASE_URL}/units/${u.id}`, { method: 'DELETE' });
        }

        // 2. CREATE DIVISION
        console.log("Creating Division...");
        const div8 = await createUnit({
            name: "OCTAVA DIVISIÓN - YOPAL",
            type: "DIVISION",
            commander: { rank: "MAYOR GENERAL", name: "FABIO LEONARDO CARO CANCELADO" },
            personnelBreakdown: { officers: 45, ncos: 120, professionalSoldiers: 80, slRegulars: 40 },
            location: { lat: 5.3372, lon: -72.3959 },
            status: "OPERATIONAL",
            unitSituationType: "ORGANICA"
        });

        // 3. CREATE BRIGADES
        console.log("Creating Brigades...");
        const brig16 = await createUnit({
            name: "DÉCIMA SEXTA BRIGADA - CASANARE",
            type: "BRIGADE",
            parentId: div8.id,
            location: { lat: 5.3400, lon: -72.3900 },
            status: "OPERATIONAL",
            unitSituationType: "ORGANICA"
        });

        const brig18 = await createUnit({
            name: "DÉCIMA OCTAVA BRIGADA - ARAUCA",
            type: "BRIGADE",
            parentId: div8.id,
            location: { lat: 7.0850, lon: -70.7590 },
            status: "OPERATIONAL",
            unitSituationType: "ORGANICA"
        });

        // 4. CREATE BATTALIONS
        console.log("Creating Battalions...");
        const bi44 = await createUnit({
            name: "BATALLÓN DE INFANTERÍA NO. 44 RAMÓN NONATO PÉREZ",
            type: "BATTALION",
            parentId: brig16.id,
            location: { lat: 4.9520, lon: -72.7530 },
            status: "OPERATIONAL",
            unitSituationType: "ORGANICA"
        });

        const ba18 = await createUnit({
            name: "BATALLÓN DE ARTILLERÍA NO. 18 JOSÉ MARÍA MANTILLA",
            type: "BATTALION",
            parentId: brig18.id,
            location: { lat: 7.0800, lon: -70.7500 },
            status: "OPERATIONAL",
            unitSituationType: "ORGANICA"
        });

        // 5. CREATE PLATOONS
        console.log("Creating Platoons...");
        await createUnit({
            name: "1ER PELOTÓN - CONDOR",
            type: "PLATOON",
            parentId: bi44.id,
            location: { lat: 4.9530, lon: -72.7540 },
            status: "OPERATIONAL",
            unitSituationType: "ORGANICA"
        });

        // 6. CREATE ASSETS
        console.log("Creating Artillery Pieces...");
        await fetch(`${BASE_URL}/artillery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: "ART-8-1",
                name: "OBUS 105MM M101",
                type: "HOWITZER",
                status: "AVAILABLE",
                maxRangeMeters: 11000,
                currentLocation: { lat: 7.0810, lon: -70.7510 },
                assignedUnitId: ba18.id
            })
        });

        console.log("--- MASTER SEED COMPLETED ---");
    } catch (e) {
        console.error("Master seed failed:", e);
    }
};

run();
