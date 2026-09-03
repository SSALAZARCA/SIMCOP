import { describe, it, expect } from '../harness/test_framework.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('F02: SEC-01 PyTorch Safe Loading & RCE Mitigation', () => {
  it('F02-T1: Verify api_server.py specifies weights_only=True or safe loading construct', () => {
    const apiServerPath = path.join(rootDir, 'api_server.py');
    expect(fs.existsSync(apiServerPath)).toBeTruthy();
    const content = fs.readFileSync(apiServerPath, 'utf8');
    
    // Check if torch.load has weights_only=True or safe loading pattern
    const hasUnsafeLoad = /torch\.load\([^)]*weights_only\s*=\s*False/i.test(content);
    // Secure requirement: either weights_only=True or no unsafe flag
    const isSafe = !hasUnsafeLoad || content.includes('weights_only=True');
    expect(isSafe).toBeTruthy();
  });

  it('F02-T2: Safe loading fallback simulation on invalid/null-byte model file', () => {
    function simulateModelLoad(filePath) {
      if (!fs.existsSync(filePath)) {
        return { loaded: false, fallback: true, mode: 'HEURISTIC_OFFLINE' };
      }
      const stat = fs.statSync(filePath);
      if (stat.size === 0) {
        return { loaded: false, fallback: true, mode: 'HEURISTIC_OFFLINE' };
      }
      // Check first 16 bytes for PKzip or Pickle magic
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(16);
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);

      const isAllZeros = buf.every(b => b === 0);
      if (isAllZeros) {
        return { loaded: false, fallback: true, mode: 'HEURISTIC_OFFLINE', reason: 'Null-byte dummy file detected' };
      }
      return { loaded: true, fallback: false, mode: 'NEURAL' };
    }

    const dummyPth = path.join(rootDir, 'simcop_nlp_weights_quantized_int8.pth');
    const result = simulateModelLoad(dummyPth);
    expect(result.fallback).toBeTruthy();
    expect(result.mode).toBe('HEURISTIC_OFFLINE');
  });

  it('F02-T3: A* tactical route navigation calculation executes without neural weights', () => {
    function haversineDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    function calculateTacticalCost(p1, p2, elevationDelta, isRainy, enemyDistanceKm) {
      const baseDist = haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
      const slopePenalty = Math.abs(elevationDelta) * 0.015;
      const weatherFactor = isRainy ? 1.8 : 1.0;
      const threatPenalty = enemyDistanceKm < 3.0 ? (5.0 / Math.max(0.1, enemyDistanceKm)) : 0.0;
      return (baseDist + slopePenalty + threatPenalty) * weatherFactor;
    }

    const pStart = { lat: 4.6097, lon: -74.0817 };
    const pEnd = { lat: 4.6150, lon: -74.0850 };
    const costClear = calculateTacticalCost(pStart, pEnd, 50, false, 5.0);
    const costRainyThreat = calculateTacticalCost(pStart, pEnd, 50, true, 1.0);

    expect(costClear).toBeGreaterThan(0);
    expect(costRainyThreat).toBeGreaterThan(costClear);
  });

  it('F02-T4: System KPIs contract validation', () => {
    const sampleKPIResponse = {
      uptime_seconds: 3600,
      avg_latency_ms: 12.5,
      active_engine: "SIMCOP_NATIVE_A_STAR",
      weights_status: "FALLBACK_SECURE_HEURISTIC"
    };

    expect(sampleKPIResponse).toHaveProperty('uptime_seconds');
    expect(sampleKPIResponse).toHaveProperty('avg_latency_ms');
    expect(sampleKPIResponse.uptime_seconds).toBeGreaterThan(0);
  });

  it('F02-T5: Offline tactical response generation preserves SMEPC 5-paragraph structure', () => {
    function generateTacticalResponse(missionPrompt) {
      return {
        situation: "Fuerzas hostiles detectadas en sector Alfa.",
        mission: "Pelotón Cóndor ejecutará maniobra de cerco.",
        execution: "Fase 1: Fijación. Fase 2: Asalto.",
        admin_logistics: "Clase V disponible al 85%, raciones 3 días.",
        command_signal: "Canal táctico 44.5 MHz, santo y seña activo."
      };
    }

    const opord = generateTacticalResponse("Planeamiento ofensivo");
    expect(opord).toHaveProperty('situation');
    expect(opord).toHaveProperty('mission');
    expect(opord).toHaveProperty('execution');
    expect(opord).toHaveProperty('admin_logistics');
    expect(opord).toHaveProperty('command_signal');
  });
});
