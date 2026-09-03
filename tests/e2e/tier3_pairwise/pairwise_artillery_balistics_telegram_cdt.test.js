import { describe, it, expect } from '../harness/test_framework.js';

describe('Pairwise 5: Artillery Ballistics FCS + Atmospheric Correction + Telegram CDT Dispatch', () => {
  // Trigonometric / Ballistic trajectory calculation
  function calculateArtillerySolution(weaponType, targetRangeMeters, deltaAltitudeMeters, weather) {
    const muzzleVelocities = {
      '155mm_HOWITZER': 827, // m/s
      '105mm_LG1': 710,      // m/s
      '120mm_MORTAR': 318    // m/s
    };

    const v0 = muzzleVelocities[weaponType] || 500;
    const g = 9.80665;

    // Atmospheric correction factor (wind tail/head + air density via temp/pressure)
    const tempFactor = (weather.tempCelsius - 15) * 0.002;
    const windEffect = weather.headwindKmh * 1.5;
    const adjustedRange = targetRangeMeters - tempFactor * 100 + windEffect;

    // Angle of elevation: theta = 0.5 * asin( g * R / v0^2 )
    const sin2Theta = (g * adjustedRange) / (v0 * v0);
    if (sin2Theta > 1.0) {
      return { inRange: false, error: 'Target out of maximum effective ballistic range' };
    }

    const angleLowRad = 0.5 * Math.asin(sin2Theta);
    const angleHighRad = 0.5 * (Math.PI - Math.asin(sin2Theta));

    const lowElevMils = (angleLowRad * (6400 / (2 * Math.PI))).toFixed(0);
    const highElevMils = (angleHighRad * (6400 / (2 * Math.PI))).toFixed(0);

    const timeOfFlightLowSec = (2 * v0 * Math.sin(angleLowRad) / g).toFixed(1);
    const timeOfFlightHighSec = (2 * v0 * Math.sin(angleHighRad) / g).toFixed(1);

    return {
      inRange: true,
      weaponType,
      targetRangeMeters,
      lowAngle: { elevationMils: Number(lowElevMils), timeOfFlightSec: Number(timeOfFlightLowSec) },
      highAngle: { elevationMils: Number(highElevMils), timeOfFlightSec: Number(timeOfFlightHighSec) },
      mrsiCapable: true
    };
  }

  function formatTelegramFiringOrder(batteryId, targetGrid, solution) {
    return `🚨 ORDEN DE FUEGO CDT - BATERIA ${batteryId}
🎯 Blanco: ${targetGrid}
💥 Pieza: ${solution.weaponType}
📐 Elevación Arco Bajo: ${solution.lowAngle.elevationMils} mils (ToF: ${solution.lowAngle.timeOfFlightSec}s)
📐 Elevación Arco Alto: ${solution.highAngle.elevationMils} mils (ToF: ${solution.highAngle.timeOfFlightSec}s)
⚡ Modalidad: IMPACTO SIMULTANEO (MRSI)`;
  }

  it('Pairwise-5.1: Ballistics FCS computes high and low angle solutions for 155mm piece with weather correction', () => {
    const weather = { tempCelsius: 22, headwindKmh: 10, pressureHpa: 1013 };
    const solution = calculateArtillerySolution('155mm_HOWITZER', 12000, 150, weather);

    expect(solution.inRange).toBeTruthy();
    expect(solution.lowAngle.elevationMils).toBeGreaterThan(0);
    expect(solution.highAngle.elevationMils).toBeGreaterThan(solution.lowAngle.elevationMils);
    expect(solution.highAngle.timeOfFlightSec).toBeGreaterThan(solution.lowAngle.timeOfFlightSec);
  });

  it('Pairwise-5.2: Targets beyond maximum aerodynamic range return clean error', () => {
    const weather = { tempCelsius: 15, headwindKmh: 0, pressureHpa: 1013 };
    const outOfRange = calculateArtillerySolution('120mm_MORTAR', 25000, 0, weather); // Mortar cannot shoot 25km

    expect(outOfRange.inRange).toBeFalsy();
    expect(outOfRange.error).toContain('out of maximum');
  });

  it('Pairwise-5.3: CDT generates structured Telegram tactical firing message with MRSI parameters', () => {
    const weather = { tempCelsius: 18, headwindKmh: 5, pressureHpa: 1015 };
    const solution = calculateArtillerySolution('105mm_LG1', 8500, 0, weather);
    const msg = formatTelegramFiringOrder('LG1-BATERIA-CHARLIE', 'GRID-8877-4433', solution);

    expect(msg).toContain('ORDEN DE FUEGO CDT');
    expect(msg).toContain('LG1-BATERIA-CHARLIE');
    expect(msg).toContain('Elevación Arco Bajo');
    expect(msg).toContain('MRSI');
  });
});
