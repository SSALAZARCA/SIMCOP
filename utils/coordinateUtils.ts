import type { GeoLocation } from '../types';

function toDMS(coordinate: number, isLongitude: boolean): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  let direction = '';
  if (isLongitude) {
    direction = coordinate >= 0 ? 'E' : 'W';
  } else {
    direction = coordinate >= 0 ? 'N' : 'S';
  }

  return `${degrees}°${minutes}′${seconds}″ ${direction}`;
}

export function decimalToDMS(location: GeoLocation | undefined): string {
  if (!location) {
    return "N/A";
  }
  const latDMS = toDMS(location.lat, false);
  const lonDMS = toDMS(location.lon, true);
  return `${latDMS}, ${lonDMS}`;
}

export function dmsToDecimal(dmsString: string, isLongitude: boolean): number | null {
  if (!dmsString || typeof dmsString !== 'string') {
    return null;
  }

  const dmsRegex = /(\d{1,3})°\s*(\d{1,2})′\s*(\d{1,2}(?:\.\d+)?)″\s*([NSEWnsew])/i;
  const match = dmsString.trim().match(dmsRegex);

  if (!match) {
    return null; 
  }

  const degrees = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);
  const direction = match[4].toUpperCase();

  if (degrees < 0 || degrees > (isLongitude ? 180 : 90) || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
    return null; // Invalid range
  }

  let decimal = degrees + (minutes / 60) + (seconds / 3600);

  if (isLongitude) {
    if (direction === 'W') decimal = -decimal;
    else if (direction !== 'E') return null; // Invalid direction for longitude
  } else { // Latitude
    if (direction === 'S') decimal = -decimal;
    else if (direction !== 'N') return null; // Invalid direction for latitude
  }
  
  // Final check for valid decimal range
  if (isLongitude && (decimal < -180 || decimal > 180)) return null;
  if (!isLongitude && (decimal < -90 || decimal > 90)) return null;

  return decimal;
}