const API_URL = 'http://localhost:8080/api/units';

const unitIds = [
    "8-DIV",
    "16-BRIG", "18-BRIG", "28-BRIG",
    "BI-44", "GM-16", "BEING-16", "BASPC-16",
    "BI-24", "GM-18", "BA-18",
    "BIS-45", "BIMOT-43", "BASPC-28"
];

const deleteUnit = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            console.error(`Error eliminando unidad ${id}: ${response.status}`);
        } else {
            console.log(`Unidad ${id} eliminada.`);
        }
    } catch (e) {
        console.error(`Error de red eliminando unidad ${id}: ${e.message}`);
    }
};

const run = async () => {
    console.log('--- Iniciando Limpieza de la Octava División ---');
    // Delete in reverse order to respect hierarchy if needed (though backend might not enforce it)
    for (const id of unitIds.reverse()) {
        await deleteUnit(id);
    }
    console.log('--- Limpieza Completada ---');
};

run();
