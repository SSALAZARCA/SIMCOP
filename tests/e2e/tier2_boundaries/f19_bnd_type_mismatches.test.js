import { describe, it, expect } from '../harness/test_framework.js';

describe('F19-BND: Type Safety, Schema Discrepancies & SIDC Boundaries', () => {
  // NATO MIL-STD-2525 SIDC symbol code parsing
  function validateAndParseSIDC(sidc) {
    if (!sidc || typeof sidc !== 'string' || sidc.length !== 15) {
      return { valid: false, error: 'SIDC must be exactly 15 alphanumeric characters' };
    }

    const standardIdentity = sidc[1]; // F=Friend, H=Hostile, N=Neutral, U=Unknown
    const validIdentities = ['F', 'H', 'N', 'U', 'A', 'J', 'K'];
    if (!validIdentities.includes(standardIdentity.toUpperCase())) {
      return { valid: false, error: `Invalid standard identity '${standardIdentity}'` };
    }

    return {
      valid: true,
      identity: standardIdentity.toUpperCase(),
      scheme: sidc[0],
      dimension: sidc[2],
      echelon: sidc[11]
    };
  }

  function normalizeUnitDTO(rawJson) {
    return {
      id: String(rawJson.id || ''),
      name: String(rawJson.name || 'UNNAMED'),
      sidc: rawJson.sidc ? String(rawJson.sidc) : 'SFGPU-------',
      coordinates: {
        lat: Number(rawJson.lat ?? rawJson.latitude ?? 0),
        lon: Number(rawJson.lon ?? rawJson.longitude ?? 0)
      },
      rationsPercent: Number(rawJson.rations ?? rawJson.rationsPercent ?? 100),
      ammoPercent: Number(rawJson.ammo ?? rawJson.ammoPercent ?? 100),
      fuelPercent: Number(rawJson.fuel ?? rawJson.fuelPercent ?? 100)
    };
  }

  it('F19-BND-T1: Valid 15-character NATO MIL-STD-2525 SIDC code is parsed accurately', () => {
    const parsed = validateAndParseSIDC('SFGPUCI----E---');
    expect(parsed.valid).toBeTruthy();
    expect(parsed.identity).toBe('F');
  });

  it('F19-BND-T2: Invalid SIDC length or format returns structured validation error', () => {
    expect(validateAndParseSIDC('TOO_SHORT').valid).toBeFalsy();
    expect(validateAndParseSIDC(null).valid).toBeFalsy();
  });

  it('F19-BND-T3: DTO normalizer accepts both lat/lon and latitude/longitude schemas', () => {
    const dto1 = normalizeUnitDTO({ id: 1, name: 'Alfa', lat: 4.5, lon: -74.1 });
    const dto2 = normalizeUnitDTO({ id: '1', name: 'Alfa', latitude: 4.5, longitude: -74.1 });

    expect(dto1.coordinates).toEqual(dto2.coordinates);
    expect(dto1.id).toBe('1');
  });

  it('F19-BND-T4: Extra unexpected fields in JSON response do not corrupt normalized entity', () => {
    const rawWithExtra = {
      id: 'U99',
      name: 'Bravo',
      lat: 4.0,
      lon: -74.0,
      unexpectedField: 'SHOULD_NOT_CRASH',
      internalServerId: 9999
    };

    const norm = normalizeUnitDTO(rawWithExtra);
    expect(norm.id).toBe('U99');
    expect(norm.name).toBe('Bravo');
  });

  it('F19-BND-T5: Missing logistics percentages default safely to 100%', () => {
    const norm = normalizeUnitDTO({ id: 'U1' });
    expect(norm.rationsPercent).toBe(100);
    expect(norm.ammoPercent).toBe(100);
    expect(norm.fuelPercent).toBe(100);
  });
});
