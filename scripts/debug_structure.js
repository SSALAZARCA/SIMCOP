import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080/api';

const updatedUnit = async (id, data) => {
    try {
        const response = await fetch(`${BASE_URL}/units/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            console.error(`Status ${response.status} updating ${id}`);
            console.error(await response.text());
        } else {
            console.log(`Unit ${id} updated.`);
        }
    } catch (e) { console.error(e); }
};

const run = async () => {
    console.log('--- CORRECTING 8TH DIVISION STRUCTURE PARENTS ---');

    // Fetch units to get IDs
    const response = await fetch(`${BASE_URL}/units`);
    const units = await response.json();

    // Find the Division
    const div8 = units.find(u => u.name.includes("OCTAVA DIVISIÓN"));
    if (!div8) { console.error("8-DIV not found! Please run population script."); return; }
    console.log(`8-DIV ID: ${div8.id}`);

    // Find the Brigades
    const brig16 = units.find(u => u.name.includes("DÉCIMA SEXTA BRIGADA"));
    const brig18 = units.find(u => u.name.includes("DÉCIMA OCTAVA BRIGADA"));
    const brig28 = units.find(u => u.name.includes("VIGÉSIMA OCTAVA BRIGADA"));

    // Update 16-BRIG
    if (brig16) {
        console.log(`Updating 16-BRIG (Current Parent: ${brig16.parentId}) to Parent: ${div8.id}`);
        // We must send the whole object generally, or at least what the controller expects.
        // My controller update logic: unit.setParentId(unitDetails.getParentId()); 
        // It reads from body. I can send just the changed fields if Jackson deserializes partial JSON?
        // But usually it Deserializes to a new Object with nulls for missing fields.
        // And then: unit.setName(unitDetails.getName()); 
        // So if I send name=null, it might overwrite name with null! 
        // I should send the COMPLETE object with the ID changed.

        const updatePayload = { ...brig16, parentId: div8.id };
        await updatedUnit(brig16.id, updatePayload);
    }

    if (brig18) {
        console.log(`Updating 18-BRIG (Current Parent: ${brig18.parentId}) to Parent: ${div8.id}`);
        const updatePayload = { ...brig18, parentId: div8.id };
        await updatedUnit(brig18.id, updatePayload);
    }

    if (brig28) {
        console.log(`Updating 28-BRIG (Current Parent: ${brig28.parentId}) to Parent: ${div8.id}`);
        const updatePayload = { ...brig28, parentId: div8.id };
        await updatedUnit(brig28.id, updatePayload);
    }

    // Now verify the Platoons parent
    const pl1 = units.find(u => u.name.includes("1ER PELOTÓN - CONDOR"));
    const bi44 = units.find(u => u.name.includes("BATALLÓN DE INFANTERÍA NO. 44"));

    if (pl1 && bi44) {
        console.log(`Updating Platoon 1 (Current Parent: ${pl1.parentId}) to Parent: ${bi44.id}`);
        const updatePayload = { ...pl1, parentId: bi44.id };
        await updatedUnit(pl1.id, updatePayload);
    }

};

run();
