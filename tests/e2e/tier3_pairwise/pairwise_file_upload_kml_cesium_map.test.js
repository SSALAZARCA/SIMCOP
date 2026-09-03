import { describe, it, expect } from '../harness/test_framework.js';
import path from 'path';

describe('Pairwise 4: File Upload Security + KML / GeoJSON Parsing + Cesium SIDC Mapping', () => {
  const allowedExtensions = new Set(['.kml', '.kmz', '.geojson', '.json']);

  function parseKMLPlacemarks(kmlContent) {
    const placemarks = [];
    const placemarkRegex = /<Placemark>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<coordinates>(.*?)<\/coordinates>[\s\S]*?<\/Placemark>/gi;
    let match;
    while ((match = placemarkRegex.exec(kmlContent)) !== null) {
      const name = match[1].trim();
      const coords = match[2].trim().split(',');
      placemarks.push({
        name,
        lon: parseFloat(coords[0]),
        lat: parseFloat(coords[1]),
        alt: coords[2] ? parseFloat(coords[2]) : 0
      });
    }
    return placemarks;
  }

  function mapPlacemarkToCesiumEntity(placemark) {
    return {
      id: 'entity-' + placemark.name.toLowerCase().replace(/\s+/g, '_'),
      name: placemark.name,
      position: {
        longitude: placemark.lon,
        latitude: placemark.lat,
        height: placemark.alt
      },
      billboard: {
        sidc: 'SFGPUCI----E---', // Friendly infantry NATO symbol
        scale: 1.0
      }
    };
  }

  it('Pairwise-4.1: Uploading valid KML file parses tactical placemarks and geographic coordinates', () => {
    const sampleKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Puesto Mando Avanzado</name>
      <coordinates>-74.0817,4.6097,2600</coordinates>
    </Placemark>
    <Placemark>
      <name>Punto Observacion Lobo</name>
      <coordinates>-74.0850,4.6150,2750</coordinates>
    </Placemark>
  </Document>
</kml>`;

    const placemarks = parseKMLPlacemarks(sampleKML);
    expect(placemarks).toHaveLength(2);
    expect(placemarks[0].name).toBe('Puesto Mando Avanzado');
    expect(placemarks[0].lat).toBeCloseTo(4.6097);
    expect(placemarks[0].lon).toBeCloseTo(-74.0817);
  });

  it('Pairwise-4.2: Parsed placemarks convert to Cesium 3D entities with military SIDC metadata', () => {
    const placemark = { name: 'Peloton Condor', lat: 4.6097, lon: -74.0817, alt: 2600 };
    const entity = mapPlacemarkToCesiumEntity(placemark);

    expect(entity.id).toBe('entity-peloton_condor');
    expect(entity.position.latitude).toBeCloseTo(4.6097);
    expect(entity.billboard.sidc).toBe('SFGPUCI----E---');
  });

  it('Pairwise-4.3: Path traversal attempt in overlay upload is neutralized', () => {
    function processOverlayUpload(clientFilename) {
      const ext = path.extname(clientFilename).toLowerCase();
      if (!allowedExtensions.has(ext)) {
        return { status: 400, error: 'Disallowed extension' };
      }
      const safeBasename = path.basename(clientFilename);
      return { status: 200, savedPath: `uploads/${safeBasename}` };
    }

    const res = processOverlayUpload('../../../etc/malicious.kml');
    expect(res.status).toBe(200);
    expect(res.savedPath).toBe('uploads/malicious.kml');
  });
});
