import { useState, useEffect } from 'react';
import type { TacticalClocks } from '../types/sigep';

/**
 * Computes Colombia Operational Time (COT - UTC-5) and Zulu NATO Time (UTC)
 */
function computeClocks(now: Date): TacticalClocks {
  // 1. Zulu (UTC) Military Time
  const utcHours = String(now.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
  const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
  const zuluTime = `${utcHours}:${utcMinutes}:${utcSeconds}Z`;
  const zuluFormatted = `Z: ${utcHours}:${utcMinutes}:${utcSeconds} UTC`;

  // 2. Local Operational Time (Colombia COT / UTC-5)
  let localTime: string;
  try {
    const formatter = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    localTime = formatter.format(now);
  } catch {
    // Fallback: manual calculation for UTC-5
    const cotMs = now.getTime() - 5 * 3600 * 1000;
    const cotDate = new Date(cotMs);
    const lH = String(cotDate.getUTCHours()).padStart(2, '0');
    const lM = String(cotDate.getUTCMinutes()).padStart(2, '0');
    const lS = String(cotDate.getUTCSeconds()).padStart(2, '0');
    localTime = `${lH}:${lM}:${lS}`;
  }

  const localFormatted = `L: ${localTime} COT`;

  return {
    localTime,
    zuluTime,
    localFormatted,
    zuluFormatted,
    date: now
  };
}

/**
 * Tactical Clocks Hook:
 * Updates synchronized Local COT and Zulu UTC operational clocks every 1000ms.
 */
export function useTacticalClocks(): TacticalClocks {
  const [clocks, setClocks] = useState<TacticalClocks>(() => computeClocks(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setClocks(computeClocks(new Date()));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return clocks;
}

export default useTacticalClocks;
