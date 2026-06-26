import fetch from 'node-fetch';

const run = async () => {
    try {
        const response = await fetch('http://localhost:8080/api/units');
        const units = await response.json();

        const div8 = units.find(u => u.name.includes("OCTAVA DIVISIÓN"));
        const brig16 = units.find(u => u.name.includes("DÉCIMA SEXTA BRIGADA"));
        const bi44 = units.find(u => u.name.includes("BATALLÓN DE INFANTERÍA NO. 44"));
        const pl1 = units.find(u => u.name.includes("1ER PELOTÓN"));

        console.log("--- VERIFICATION ---");
        console.log(`DIV 8 ID: ${div8?.id}`);
        console.log(`BRIG 16 Parent: ${brig16?.parentId} | Expected: ${div8?.id} | MATCH: ${brig16?.parentId === div8?.id}`);
        console.log(`BI-44 Parent: ${bi44?.parentId} | Expected: ${brig16?.id} | MATCH: ${bi44?.parentId === brig16?.id}`);
        console.log(`PLATOON 1 Parent: ${pl1?.parentId} | Expected: ${bi44?.id} | MATCH: ${pl1?.parentId === bi44?.id}`);

    } catch (e) { console.error(e); }
};
run();
