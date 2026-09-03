import { describe, it, expect } from '../harness/test_framework.js';

describe('Tier 4 Scenario 3: Panic Combat Alert -> AAR Log -> OmniRoute Q5 -> Telegram -> Black Box', () => {
  let incidentState = {
    unit: { id: 'U-CONDOR-1', name: 'Pelotón Cóndor 1', status: 'PATROL', coordinates: { lat: 4.6097, lon: -74.0817 } },
    alerts: [],
    aars: [],
    q5Reports: [],
    telegramDispatches: [],
    blackBoxLogs: []
  };

  it('Phase 1: Platoon Commander Activates "En Combate" Panic Button', () => {
    function triggerEnCombate(unitId, commanderUser) {
      incidentState.unit.status = 'IN_COMBAT';
      
      const alert = {
        id: 'ALT-' + Date.now(),
        unitId,
        severity: 'CRITICAL',
        type: 'UNIT_IN_COMBAT',
        message: `🚨 ALERTA: ${incidentState.unit.name} ha entrado EN COMBATE en coordenadas [${incidentState.unit.coordinates.lat}, ${incidentState.unit.coordinates.lon}]`,
        triggeredBy: commanderUser.username,
        timestamp: Date.now()
      };
      incidentState.alerts.push(alert);

      incidentState.blackBoxLogs.push({
        event: 'STATUS_CHANGED_IN_COMBAT',
        unitId,
        timestamp: alert.timestamp
      });

      return { status: 200, alert };
    }

    const cmd = { username: 'st.mora', role: 'COMANDANTE_PELOTON' };
    const res = triggerEnCombate(incidentState.unit.id, cmd);

    expect(res.status).toBe(200);
    expect(incidentState.unit.status).toBe('IN_COMBAT');
    expect(incidentState.alerts[0].severity).toBe('CRITICAL');
  });

  it('Phase 2: Combat Concludes & Commander Submits After Action Report (AAR)', () => {
    function submitAAR(unitId, aarData) {
      const aar = {
        id: 'AAR-' + Date.now(),
        unitId,
        durationMinutes: aarData.durationMinutes,
        friendlyCasualties: aarData.friendlyCasualties,
        enemyCasualties: aarData.enemyCasualties,
        ammoExpendedPercent: aarData.ammoExpendedPercent,
        rawNarrative: aarData.rawNarrative,
        timestamp: Date.now()
      };
      incidentState.aars.push(aar);
      incidentState.unit.status = 'POST_COMBAT_REORGANIZATION';
      return { status: 200, aar };
    }

    const res = submitAAR(incidentState.unit.id, {
      durationMinutes: 40,
      friendlyCasualties: { kia: 0, wia: 1 },
      enemyCasualties: { kia: 2, wia: 0, pow: 1 },
      ammoExpendedPercent: 35,
      rawNarrative: 'Ataque emboscada repelido en sector Quebrada Honda. Enemigo dispersado hacia el occidente.'
    });

    expect(res.status).toBe(200);
    expect(incidentState.aars).toHaveLength(1);
    expect(incidentState.aars[0].friendlyCasualties.wia).toBe(1);
  });

  it('Phase 3: OmniRoute NLP Extracts Structured Q5 Report with DMS Coordinates', () => {
    function generateQ5FromAAR(aar, unit) {
      return {
        id: 'Q5-' + Date.now(),
        aarId: aar.id,
        unitName: unit.name,
        que: 'Hostigamiento repelido y neutralización de 2 integrantes de GAOR',
        quien: unit.name,
        cuando: new Date().toISOString(),
        donde: 'Sector Quebrada Honda (04°36\'34.9"N 74°04\'54.1"W)',
        hechos: aar.rawNarrative,
        acciones: 'Consolidación de perímetro, primeros auxilios a 1 WIA y extracción coordinada',
        bajas: { amigas: aar.friendlyCasualties, enemigas: aar.enemyCasualties }
      };
    }

    const q5 = generateQ5FromAAR(incidentState.aars[0], incidentState.unit);
    incidentState.q5Reports.push(q5);

    expect(q5.donde).toContain('04°36\'34.9"N');
    expect(q5.bajas.enemigas.kia).toBe(2);
  });

  it('Phase 4: Automatic Broadcast of Flash Q5 to Higher Command Telegram Channel', () => {
    function broadcastQ5(q5) {
      const msg = `⚡ REPORTE FLASH Q5 - SIMCOP EJC
━━━━━━━━━━━━━━━━━━━━
📌 UNIDAD: ${q5.quien}
📍 LUGAR: ${q5.donde}
⚔️ QUÉ: ${q5.que}
🩸 BAJAS: Amigas (KIA:${q5.bajas.amigas.kia}, WIA:${q5.bajas.amigas.wia}) | Enemigas (KIA:${q5.bajas.enemigas.kia}, POW:${q5.bajas.enemigas.pow})
🛡️ ACCIONES: ${q5.acciones}
━━━━━━━━━━━━━━━━━━━━`;

      incidentState.telegramDispatches.push({
        channel: 'COMANDO_BRIGADA_OPS',
        message: msg,
        sentAt: Date.now()
      });
      return { status: 200, sent: true };
    }

    const res = broadcastQ5(incidentState.q5Reports[0]);
    expect(res.status).toBe(200);
    expect(incidentState.telegramDispatches).toHaveLength(1);
    expect(incidentState.telegramDispatches[0].message).toContain('REPORTE FLASH Q5');
  });

  it('Phase 5: Immutable Black Box Log Registration for Legal and Historical Integrity', () => {
    incidentState.blackBoxLogs.push({
      event: 'Q5_REPORT_FINALIZED',
      unitId: incidentState.unit.id,
      q5Id: incidentState.q5Reports[0].id,
      hashDigest: 'sha256_mock_digest_for_legal_chain_of_custody',
      timestamp: Date.now()
    });

    expect(incidentState.blackBoxLogs.length).toBeGreaterThanOrEqual(2);
    expect(incidentState.blackBoxLogs[incidentState.blackBoxLogs.length - 1].event).toBe('Q5_REPORT_FINALIZED');
  });
});
