const API_URL = 'http://localhost:8080/api/units';

const createUnit = async (unit) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(unit)
        });
        if (!response.ok) {
            const err = await response.text();
            console.error(`Error creando unidad ${unit.name}: ${err}`);
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error(`Error de red creando unidad ${unit.name}: ${e.message}`);
        return null;
    }
};

const run = async () => {
    console.log('--- Iniciando Población de la Octava División ---');

    // Octava División HQ
    const div8 = await createUnit({
        id: "8-DIV",
        name: "OCTAVA DIVISIÓN - YOPAL",
        type: "DIVISION",
        commander: { rank: "MAYOR GENERAL", name: "FABIO LEONARDO CARO CANCELADO" },
        personnelBreakdown: { officers: 45, ncos: 120, professionalSoldiers: 80, slRegulars: 40 },
        location: { lat: 5.3372, lon: -72.3959 },
        status: "OPERATIONAL",
        equipment: ["Vehículos Blindados", "Drones de Vigilancia", "Sistemas de Comunicación Satelital"],
        capabilities: ["Mando y Control", "Planificación Estratégica", "Inteligencia de División"],
        parentId: null,
        unitSituationType: "ORGANICA"
    });

    if (!div8) return;

    // 16ª Brigada - Casanare
    const brig16 = await createUnit({
        id: "16-BRIG",
        name: "DÉCIMA SEXTA BRIGADA - CASANARE",
        type: "BRIGADE",
        commander: { rank: "CORONEL", name: "CARLOS REALPE" },
        personnelBreakdown: { officers: 30, ncos: 85, professionalSoldiers: 120, slRegulars: 60 },
        location: { lat: 5.3400, lon: -72.3900 },
        status: "OPERATIONAL",
        parentId: div8.id,
        unitSituationType: "ORGANICA"
    });

    // 18ª Brigada - Arauca
    const brig18 = await createUnit({
        id: "18-BRIG",
        name: "DÉCIMA OCTAVA BRIGADA - ARAUCA",
        type: "BRIGADE",
        commander: { rank: "CORONEL", name: "CESAR AUGUSTO KARAN" },
        personnelBreakdown: { officers: 32, ncos: 90, professionalSoldiers: 150, slRegulars: 70 },
        location: { lat: 7.0850, lon: -70.7590 },
        status: "OPERATIONAL",
        parentId: div8.id,
        unitSituationType: "ORGANICA"
    });

    // 28ª Brigada - Vichada
    const brig28 = await createUnit({
        id: "28-BRIG",
        name: "VIGÉSIMA OCTAVA BRIGADA - VICHADA",
        type: "BRIGADE",
        commander: { rank: "CORONEL", name: "RICARDO SALAZAR" },
        personnelBreakdown: { officers: 28, ncos: 75, professionalSoldiers: 110, slRegulars: 50 },
        location: { lat: 6.1880, lon: -67.4850 },
        status: "OPERATIONAL",
        parentId: div8.id,
        unitSituationType: "ORGANICA"
    });

    if (!brig16 || !brig18 || !brig28) return;

    // Unidades de la 16ª Brigada
    const units16 = [
        { id: "BI-44", name: "BATALLÓN DE INFANTERÍA NO. 44 RAMÓN NONATO PÉREZ", type: "BATTALION", commander: { rank: "TC.", name: "GUSTAVO ADOLFO RODRIGUEZ" }, location: { lat: 4.9520, lon: -72.7530 }, personnelBreakdown: { officers: 25, ncos: 110, professionalSoldiers: 500, slRegulars: 180 }, parentId: brig16.id, unitSituationType: "ORGANICA" },
        { id: "GM-16", name: "GRUPO DE CABALLERÍA MONTADO NO. 16 GUÍAS DEL CASANARE", type: "BATTALION", commander: { rank: "TC.", name: "JOSE RAMON PEREZ" }, location: { lat: 5.3200, lon: -72.3800 }, personnelBreakdown: { officers: 22, ncos: 95, professionalSoldiers: 420, slRegulars: 150 }, parentId: brig16.id, unitSituationType: "ORGANICA" },
        { id: "BEING-16", name: "BATALLÓN DE INGENIEROS NO. 16 RAFAEL NAVAS PARDO", type: "BATTALION", commander: { rank: "TC.", name: "OSCAR MARIN" }, location: { lat: 5.3350, lon: -72.3980 }, personnelBreakdown: { officers: 18, ncos: 70, professionalSoldiers: 320, slRegulars: 120 }, parentId: brig16.id, unitSituationType: "ORGANICA" },
        { id: "BASPC-16", name: "BATALLÓN DE APOYO Y SERVICIOS NO. 16", type: "BATTALION", commander: { rank: "TC.", name: "ANDRES VILLAR" }, location: { lat: 5.3380, lon: -72.4000 }, personnelBreakdown: { officers: 15, ncos: 80, professionalSoldiers: 200, slRegulars: 100 }, parentId: brig16.id, unitSituationType: "ORGANICA" }
    ];

    // Unidades de la 18ª Brigada
    const units18 = [
        { id: "BI-24", name: "BATALLÓN DE INFANTERÍA NO. 24 LUIS TOVAR LUCERO", type: "BATTALION", commander: { rank: "TC.", name: "JUAN CARLOS ORTIZ" }, location: { lat: 7.0320, lon: -71.2720 }, personnelBreakdown: { officers: 26, ncos: 115, professionalSoldiers: 520, slRegulars: 200 }, parentId: brig18.id, unitSituationType: "ORGANICA" },
        { id: "GM-18", name: "GRUPO DE CABALLERÍA MECANIZADO NO. 18 GABRIEL REVEIZ PIZARRO", type: "BATTALION", commander: { rank: "TC.", name: "EDWIN TORRES" }, location: { lat: 6.9530, lon: -71.8790 }, personnelBreakdown: { officers: 23, ncos: 100, professionalSoldiers: 450, slRegulars: 160 }, parentId: brig18.id, unitSituationType: "ORGANICA" },
        { id: "BA-18", name: "BATALLÓN DE ARTILLERÍA NO. 18 JOSÉ MARÍA MANTILLA", type: "BATTALION", commander: { rank: "TC.", name: "LUCAS MORENO" }, location: { lat: 7.0800, lon: -70.7500 }, personnelBreakdown: { officers: 20, ncos: 90, professionalSoldiers: 380, slRegulars: 140 }, parentId: brig18.id, unitSituationType: "ORGANICA" }
    ];

    // Unidades de la 28ª Brigada
    const units28 = [
        { id: "BIS-45", name: "BATALLÓN DE INFANTERÍA DE SELVA N.° 45 GR. PRÓSPERO PINZÓN", type: "BATTALION", commander: { rank: "TC.", name: "JAIRO LINARES" }, location: { lat: 6.1850, lon: -67.4800 }, personnelBreakdown: { officers: 24, ncos: 105, professionalSoldiers: 480, slRegulars: 170 }, parentId: brig28.id, unitSituationType: "ORGANICA" },
        { id: "BIMOT-43", name: "BATALLÓN DE INFANTERÍA MOTORIZADO N°. 43 GR. ROJAS ACEVEDO", type: "BATTALION", commander: { rank: "TC.", name: "MARCO SUAREZ" }, location: { lat: 4.4420, lon: -69.7990 }, personnelBreakdown: { officers: 22, ncos: 98, professionalSoldiers: 440, slRegulars: 160 }, parentId: brig28.id, unitSituationType: "ORGANICA" }
    ];

    const allSubUnits = [...units16, ...units18, ...units28];

    for (const unit of allSubUnits) {
        await createUnit({
            ...unit,
            status: "OPERATIONAL",
            equipment: ["Fusiles Galil", "Sistemas de Radio", "Kits de Primeros Auxilios"],
            capabilities: ["Asalto", "Patrullaje", "Control de Área"]
        });
    }

    console.log('--- Población Completada Exitosamente ---');
};

run();
