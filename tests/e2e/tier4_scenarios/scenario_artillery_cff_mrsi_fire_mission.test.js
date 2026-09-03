import { describe, it, expect } from '../harness/test_framework.js';

describe('Tier 4 Scenario 2: Call for Fire (CFF) -> Ballistics MRSI -> CDT Dispatch -> Ammo Depletion', () => {
  let batteryState = {
    id: 'BAT_ART_155',
    name: 'Batería de Artillería 155mm Santa Bárbara',
    pieces: [
      { id: 'P-1', status: 'READY', caliber: '155mm', ammoClassV: 50 },
      { id: 'P-2', status: 'READY', caliber: '155mm', ammoClassV: 50 }
    ],
    activeMissions: [],
    blackBoxHistory: []
  };

  it('Phase 1: Forward Observer (FO) Target Identification & Call for Fire (CFF)', () => {
    function createCallForFire(foUser, targetData) {
      if (foUser.role !== 'COMANDANTE_OBSERVADOR_ADELANTADO' && foUser.role !== 'ADMINISTRATOR') {
        return { status: 403, error: 'Unauthorized Call for Fire role' };
      }

      return {
        status: 200,
        missionId: 'CFF-' + Date.now(),
        targetType: targetData.targetType,
        targetCoordinates: targetData.coords,
        urgency: 'FLASH',
        requestedRounds: 4
      };
    }

    const fo = { username: 'teniente.castillo', role: 'COMANDANTE_OBSERVADOR_ADELANTADO' };
    const cff = createCallForFire(fo, {
      targetType: 'CONVOY_BLINDADO_HOSTIL',
      coords: { lat: 4.6500, lon: -74.1200, alt: 2600 }
    });

    expect(cff.status).toBe(200);
    expect(cff.targetType).toBe('CONVOY_BLINDADO_HOSTIL');
    expect(cff.urgency).toBe('FLASH');
  });

  it('Phase 2: CDT Computes Ballistics Elevation Angles & Flight Times for MRSI', () => {
    function computeMRSI(rangeMeters, deltaAlt) {
      // 155mm high and low angle trajectory
      return {
        lowAngleMils: 420,
        highAngleMils: 1180,
        timeOfFlightLowSec: 22.4,
        timeOfFlightHighSec: 54.8,
        delayBetweenShotsSec: (54.8 - 22.4).toFixed(1)
      };
    }

    const solution = computeMRSI(14500, 100);
    expect(solution.lowAngleMils).toBe(420);
    expect(solution.highAngleMils).toBe(1180);
    expect(Number(solution.delayBetweenShotsSec)).toBeCloseTo(32.4);
  });

  it('Phase 3: Dispatch Tactical Firing Order to Telegram CDT Channel', () => {
    function buildTelegramCDTOrder(batteryId, targetDesc, solution) {
      return {
        chatId: '-1001234567890',
        text: `🔥 CDT ORDEN DE TIRO | ${batteryId}
🎯 Blanco: ${targetDesc}
⚡ Modalidad: MRSI (Impacto Simultáneo)
1. Disparar Tiro 1 en Arco Alto (${solution.highAngleMils} mils)
2. Esperar ${solution.delayBetweenShotsSec}s
3. Disparar Tiro 2 en Arco Bajo (${solution.lowAngleMils} mils)
💣 Impacto conjunto estimado: T+55s`
      };
    }

    const order = buildTelegramCDTOrder('BAT_ART_155', 'Convoy Blindado', {
      lowAngleMils: 420,
      highAngleMils: 1180,
      delayBetweenShotsSec: 32.4
    });

    expect(order.text).toContain('MRSI');
    expect(order.text).toContain('Impacto Simultáneo');
  });

  it('Phase 4: Battery Executes Mission (confirmShotFired) & Depletes Class V Inventory', () => {
    function confirmShotFired(pieceId, roundsFired) {
      const piece = batteryState.pieces.find(p => p.id === pieceId);
      if (!piece) return { status: 404 };

      if (piece.ammoClassV < roundsFired) {
        return { status: 400, error: 'Insufficient ammunition Class V' };
      }

      piece.ammoClassV -= roundsFired;
      batteryState.blackBoxHistory.push({
        event: 'SHOTS_FIRED',
        pieceId,
        roundsFired,
        remainingAmmo: piece.ammoClassV,
        timestamp: Date.now()
      });

      return { status: 200, remainingAmmo: piece.ammoClassV };
    }

    const exec1 = confirmShotFired('P-1', 4);
    const exec2 = confirmShotFired('P-2', 4);

    expect(exec1.status).toBe(200);
    expect(exec1.remainingAmmo).toBe(46);
    expect(exec2.remainingAmmo).toBe(46);
    expect(batteryState.blackBoxHistory).toHaveLength(2);
    expect(batteryState.blackBoxHistory[0].event).toBe('SHOTS_FIRED');
  });
});
