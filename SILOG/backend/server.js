// ============================================================================
// SERVIDOR M2M SILOG - PUERTO 5000
// Endpoints de Sincronización para SIMCOP y SIGEP
// ============================================================================

import http from 'http';
import url from 'url';

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Service-Token, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Healthcheck
  if (pathname === '/health' || pathname === '/api/silog/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'SILOG-M2M', timestamp: new Date().toISOString() }));
    return;
  }

  // 1. Telemetría de Poder de Fuego del Pelotón para SIMCOP (GET /api/silog/simcop/combat-power/:unitId)
  if (pathname.startsWith('/api/silog/simcop/combat-power')) {
    const responsePayload = {
      platoonId: 'PEL-AURA-1',
      platoonName: 'Pelotón Aura 1 (Compañía B - BIP 9)',
      totalSoldiers: 36,
      overallFirepowerIndex: 82,
      daytimeReadinessPct: 94,
      nightReadinessPct: 38,
      rationsAutonomyDays: 5,
      sustainedFireMinutes: 48,
      nightVisionAvailabilityPct: 33,
      commCoverageScore: 100,
      operationalWeapons: {
        rifles556: 30,
        machineGuns762: 2,
        grenadeLaunchers40mm: 2,
        mortars60mm: 1
      },
      tacticalAdvisory: 'Capacidad letal diurna plena (94%). Capacidad nocturna reducida al 38% por déficit de visores PVS-14. Autonomía Clase I asegurada para 5 días. Enlace C2 Harris activo.'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responsePayload));
    return;
  }

  // 2. Paz y Salvo para SIGEP (GET /api/silog/paz-y-salvo/:soldierId)
  if (pathname.startsWith('/api/silog/paz-y-salvo')) {
    const soldierId = pathname.split('/').pop();
    const responsePayload = {
      soldierId,
      pazYSalvo: true,
      pendingItems: [],
      certificateNumber: `PAZ-SALVO-LOG-${soldierId}-${Date.now().toString().slice(-6)}`,
      message: 'Militar al día en el Armerillo e Intendencia de la Unidad.'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responsePayload));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint no encontrado en SILOG M2M' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SILOG M2M Backend] Escuchando en http://0.0.0.0:${PORT}`);
});
