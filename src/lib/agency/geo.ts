import type { Home } from "./types";

export const PHOENIX_AREAS: Record<string, [number, number]> = {
  "Downtown Phoenix": [33.4484, -112.074],
  Maryvale: [33.5007, -112.19],
  Arcadia: [33.5, -111.98],
  Ahwatukee: [33.34, -111.98],
  Scottsdale: [33.4942, -111.9261],
  Tempe: [33.4255, -111.94],
  Mesa: [33.4152, -111.8315],
  Chandler: [33.3062, -111.8413],
  Gilbert: [33.3528, -111.789],
  Glendale: [33.5387, -112.186],
  Peoria: [33.5806, -112.2374],
  "Sun City": [33.5975, -112.2718],
  "Paradise Valley": [33.531, -111.9426],
  "North Phoenix": [33.65, -112.07],
  "South Mountain": [33.38, -112.07],
  Avondale: [33.4356, -112.3496],
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough drive time: road factor 1.35 at 45 km/h average plus 4 minutes to park. */
export function travelMinutes(a: Home, b: Home): number {
  return Math.round((haversineKm(a, b) * 1.35 * 60) / 45 + 4);
}

export const TRAVEL_LIMIT_MIN = 40;
