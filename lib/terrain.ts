/**
 * Shared terrain exclusion logic for pixel grid generation and claim validation.
 *
 * Rules:
 *  - Water, oceans, rivers, canals, lakes = BLOCKED
 *  - Deserts = BLOCKED
 *  - Mountains = BLOCKED
 *  - EXCEPT: mountain countries (NP, BT, AD, CH, etc.) are always ALLOWED
 */

export const COUNTRY_BOXES: Array<{ code: string; minLat: number; maxLat: number; minLng: number; maxLng: number }> = [
  { code: "AF", minLat: 29.0, maxLat: 38.0, minLng: 60.0, maxLng: 75.0 },
  { code: "AL", minLat: 39.5, maxLat: 43.0, minLng: 19.0, maxLng: 21.5 },
  { code: "DZ", minLat: 18.9, maxLat: 37.4, minLng: -9.0, maxLng: 12.0 },
  { code: "AR", minLat: -55.0, maxLat: -21.0, minLng: -74.0, maxLng: -53.0 },
  { code: "AM", minLat: 38.8, maxLat: 41.5, minLng: 43.4, maxLng: 46.6 },
  { code: "AU", minLat: -44.0, maxLat: -10.0, minLng: 112.0, maxLng: 154.0 },
  { code: "AT", minLat: 46.4, maxLat: 49.0, minLng: 9.5, maxLng: 17.5 },
  { code: "AZ", minLat: 38.4, maxLat: 42.0, minLng: 44.7, maxLng: 50.8 },
  { code: "BD", minLat: 20.5, maxLat: 26.8, minLng: 88.0, maxLng: 92.8 },
  { code: "BE", minLat: 49.5, maxLat: 51.5, minLng: 2.5, maxLng: 6.5 },
  { code: "BF", minLat: 9.5, maxLat: 15.0, minLng: -6.0, maxLng: 3.0 },
  { code: "BJ", minLat: 6.0, maxLat: 12.5, minLng: 0.5, maxLng: 4.0 },
  { code: "BR", minLat: -34.0, maxLat: 5.5, minLng: -74.0, maxLng: -34.5 },
  { code: "BY", minLat: 51.0, maxLat: 56.5, minLng: 23.0, maxLng: 33.0 },
  { code: "CA", minLat: 42.0, maxLat: 84.0, minLng: -142.0, maxLng: -52.0 },
  { code: "CF", minLat: 2.0, maxLat: 11.5, minLng: 14.5, maxLng: 28.0 },
  { code: "CG", minLat: -5.0, maxLat: 3.5, minLng: 11.0, maxLng: 19.0 },
  { code: "CH", minLat: 45.5, maxLat: 48.0, minLng: 5.5, maxLng: 11.0 },
  { code: "CL", minLat: -56.0, maxLat: -17.5, minLng: -76.0, maxLng: -66.5 },
  { code: "CM", minLat: 1.5, maxLat: 13.5, minLng: 8.5, maxLng: 16.5 },
  { code: "CN", minLat: 18.0, maxLat: 54.0, minLng: 73.5, maxLng: 135.0 },
  { code: "CO", minLat: -4.5, maxLat: 13.0, minLng: -79.0, maxLng: -66.5 },
  { code: "CD", minLat: -13.5, maxLat: 5.5, minLng: 12.0, maxLng: 31.5 },
  { code: "CI", minLat: 4.0, maxLat: 11.0, minLng: -9.0, maxLng: -2.0 },
  { code: "HR", minLat: 42.0, maxLat: 46.5, minLng: 13.5, maxLng: 20.0 },
  { code: "CU", minLat: 19.5, maxLat: 23.5, minLng: -85.0, maxLng: -74.0 },
  { code: "CZ", minLat: 48.5, maxLat: 51.5, minLng: 12.0, maxLng: 19.0 },
  { code: "DE", minLat: 47.0, maxLat: 55.5, minLng: 5.5, maxLng: 15.5 },
  { code: "DK", minLat: 54.5, maxLat: 58.0, minLng: 7.5, maxLng: 15.5 },
  { code: "DO", minLat: 17.5, maxLat: 20.0, minLng: -72.0, maxLng: -68.3 },
  { code: "EC", minLat: -5.5, maxLat: 2.5, minLng: -81.0, maxLng: -75.0 },
  { code: "EE", minLat: 57.5, maxLat: 60.0, minLng: 21.5, maxLng: 28.5 },
  { code: "EG", minLat: 22.0, maxLat: 32.0, minLng: 25.0, maxLng: 35.0 },
  { code: "ES", minLat: 36.0, maxLat: 44.0, minLng: -10.0, maxLng: 4.5 },
  { code: "ET", minLat: 3.0, maxLat: 15.5, minLng: 33.0, maxLng: 48.5 },
  { code: "FI", minLat: 59.5, maxLat: 70.5, minLng: 19.5, maxLng: 31.5 },
  { code: "FR", minLat: 41.0, maxLat: 51.5, minLng: -5.5, maxLng: 9.5 },
  { code: "GB", minLat: 49.5, maxLat: 61.0, minLng: -9.0, maxLng: 2.0 },
  { code: "GE", minLat: 41.0, maxLat: 43.5, minLng: 40.0, maxLng: 46.5 },
  { code: "GH", minLat: 4.5, maxLat: 11.5, minLng: -4.0, maxLng: 1.5 },
  { code: "GR", minLat: 35.0, maxLat: 42.0, minLng: 19.0, maxLng: 29.5 },
  { code: "GT", minLat: 13.5, maxLat: 18.0, minLng: -92.5, maxLng: -88.0 },
  { code: "HN", minLat: 13.0, maxLat: 17.5, minLng: -89.5, maxLng: -82.0 },
  { code: "HU", minLat: 45.5, maxLat: 49.0, minLng: 16.0, maxLng: 23.0 },
  { code: "ID", minLat: -12.0, maxLat: 7.5, minLng: 95.0, maxLng: 141.0 },
  { code: "IE", minLat: 51.0, maxLat: 55.5, minLng: -11.0, maxLng: -5.0 },
  { code: "IL", minLat: 29.0, maxLat: 33.5, minLng: 34.0, maxLng: 36.0 },
  { code: "IN", minLat: 6.5, maxLat: 36.0, minLng: 68.0, maxLng: 97.5 },
  { code: "IQ", minLat: 29.0, maxLat: 37.5, minLng: 38.5, maxLng: 49.0 },
  { code: "IR", minLat: 25.0, maxLat: 40.5, minLng: 44.0, maxLng: 63.5 },
  { code: "IT", minLat: 35.5, maxLat: 47.5, minLng: 6.5, maxLng: 19.0 },
  { code: "JP", minLat: 24.0, maxLat: 46.0, minLng: 122.0, maxLng: 154.0 },
  { code: "JO", minLat: 29.0, maxLat: 33.5, minLng: 35.0, maxLng: 39.5 },
  { code: "KE", minLat: -5.0, maxLat: 5.5, minLng: 33.5, maxLng: 42.0 },
  { code: "KG", minLat: 39.0, maxLat: 43.5, minLng: 69.0, maxLng: 80.5 },
  { code: "KH", minLat: 9.5, maxLat: 15.0, minLng: 102.0, maxLng: 108.0 },
  { code: "KR", minLat: 33.0, maxLat: 39.0, minLng: 124.5, maxLng: 131.5 },
  { code: "KZ", minLat: 40.5, maxLat: 56.0, minLng: 46.5, maxLng: 88.0 },
  { code: "LA", minLat: 13.5, maxLat: 23.0, minLng: 100.0, maxLng: 108.0 },
  { code: "LB", minLat: 33.0, maxLat: 34.8, minLng: 35.0, maxLng: 36.8 },
  { code: "LK", minLat: 5.5, maxLat: 10.5, minLng: 79.5, maxLng: 82.5 },
  { code: "LT", minLat: 53.5, maxLat: 56.5, minLng: 21.0, maxLng: 27.5 },
  { code: "LU", minLat: 49.4, maxLat: 50.2, minLng: 5.5, maxLng: 6.5 },
  { code: "LV", minLat: 55.0, maxLat: 58.5, minLng: 21.0, maxLng: 29.0 },
  { code: "MA", minLat: 27.5, maxLat: 36.5, minLng: -14.0, maxLng: -1.0 },
  { code: "MC", minLat: 43.5, maxLat: 43.8, minLng: 7.3, maxLng: 7.5 },
  { code: "MD", minLat: 45.0, maxLat: 49.0, minLng: 26.5, maxLng: 30.5 },
  { code: "ME", minLat: 41.5, maxLat: 43.8, minLng: 18.4, maxLng: 20.5 },
  { code: "MG", minLat: -26.0, maxLat: -12.0, minLng: 43.0, maxLng: 51.0 },
  { code: "MK", minLat: 40.5, maxLat: 42.5, minLng: 20.0, maxLng: 23.0 },
  { code: "ML", minLat: 10.0, maxLat: 25.5, minLng: -12.0, maxLng: 4.0 },
  { code: "MM", minLat: 9.5, maxLat: 29.5, minLng: 92.0, maxLng: 102.0 },
  { code: "MN", minLat: 41.0, maxLat: 52.5, minLng: 87.5, maxLng: 120.0 },
  { code: "MR", minLat: 14.5, maxLat: 27.5, minLng: -17.0, maxLng: -5.0 },
  { code: "MW", minLat: -17.5, maxLat: -9.5, minLng: 32.5, maxLng: 36.5 },
  { code: "MX", minLat: 14.5, maxLat: 33.5, minLng: -118.5, maxLng: -86.5 },
  { code: "MY", minLat: 0.5, maxLat: 7.5, minLng: 99.0, maxLng: 119.5 },
  { code: "MZ", minLat: -19.0, maxLat: -10.0, minLng: 30.5, maxLng: 41.0 },
  { code: "NA", minLat: -29.5, maxLat: -17.0, minLng: 11.5, maxLng: 26.0 },
  { code: "NE", minLat: 11.5, maxLat: 24.0, minLng: 0.0, maxLng: 16.0 },
  { code: "NG", minLat: 4.0, maxLat: 14.5, minLng: 2.5, maxLng: 15.0 },
  { code: "NI", minLat: 10.5, maxLat: 15.5, minLng: -88.0, maxLng: -82.0 },
  { code: "NL", minLat: 50.5, maxLat: 54.0, minLng: 3.0, maxLng: 7.5 },
  { code: "NO", minLat: 58.0, maxLat: 72.0, minLng: 4.5, maxLng: 31.0 },
  { code: "NP", minLat: 26.0, maxLat: 31.0, minLng: 80.0, maxLng: 89.0 },
  { code: "NZ", minLat: -47.5, maxLat: -34.0, minLng: 166.0, maxLng: 179.0 },
  { code: "OM", minLat: 16.5, maxLat: 27.0, minLng: 51.5, maxLng: 60.5 },
  { code: "PK", minLat: 23.5, maxLat: 37.5, minLng: 60.5, maxLng: 77.5 },
  { code: "PA", minLat: 7.0, maxLat: 10.0, minLng: -83.0, maxLng: -77.0 },
  { code: "PE", minLat: -19.0, maxLat: -0.5, minLng: -82.0, maxLng: -68.5 },
  { code: "PH", minLat: 4.5, maxLat: 21.5, minLng: 116.0, maxLng: 127.0 },
  { code: "PL", minLat: 49.0, maxLat: 55.0, minLng: 14.0, maxLng: 24.5 },
  { code: "PR", minLat: 17.5, maxLat: 18.5, minLng: -67.5, maxLng: -65.0 },
  { code: "PT", minLat: 36.5, maxLat: 42.5, minLng: -10.0, maxLng: -6.0 },
  { code: "PY", minLat: -28.0, maxLat: -19.0, minLng: -62.5, maxLng: -54.5 },
  { code: "QA", minLat: 24.0, maxLat: 26.5, minLng: 50.5, maxLng: 52.5 },
  { code: "RO", minLat: 43.0, maxLat: 49.0, minLng: 20.0, maxLng: 30.5 },
  { code: "RS", minLat: 42.0, maxLat: 46.5, minLng: 18.5, maxLng: 23.5 },
  { code: "RU", minLat: 41.0, maxLat: 83.0, minLng: 19.0, maxLng: 180.0 },
  { code: "RW", minLat: -2.5, maxLat: -1.0, minLng: 29.0, maxLng: 31.0 },
  { code: "SA", minLat: 16.0, maxLat: 33.0, minLng: 34.5, maxLng: 56.0 },
  { code: "SD", minLat: 9.0, maxLat: 22.5, minLng: 21.5, maxLng: 39.0 },
  { code: "SE", minLat: 55.0, maxLat: 70.0, minLng: 10.5, maxLng: 24.0 },
  { code: "SG", minLat: 1.2, maxLat: 1.5, minLng: 103.6, maxLng: 104.0 },
  { code: "SI", minLat: 45.0, maxLat: 47.0, minLng: 13.3, maxLng: 16.8 },
  { code: "SK", minLat: 47.5, maxLat: 50.0, minLng: 16.5, maxLng: 23.0 },
  { code: "SL", minLat: 6.5, maxLat: 10.5, minLng: -14.0, maxLng: -10.0 },
  { code: "SM", minLat: 43.8, maxLat: 44.0, minLng: 12.3, maxLng: 12.6 },
  { code: "SN", minLat: 12.0, maxLat: 17.0, minLng: -18.0, maxLng: -11.0 },
  { code: "SO", minLat: -2.0, maxLat: 12.5, minLng: 40.0, maxLng: 52.0 },
  { code: "SS", minLat: 4.0, maxLat: 13.5, minLng: 23.5, maxLng: 36.0 },
  { code: "SV", minLat: 13.0, maxLat: 14.5, minLng: -90.5, maxLng: -87.5 },
  { code: "SY", minLat: 32.0, maxLat: 37.5, minLng: 35.5, maxLng: 43.0 },
  { code: "TD", minLat: 7.5, maxLat: 24.0, minLng: 13.5, maxLng: 24.0 },
  { code: "TG", minLat: 6.0, maxLat: 11.5, minLng: -2.0, maxLng: 2.0 },
  { code: "TH", minLat: 5.5, maxLat: 21.0, minLng: 97.0, maxLng: 106.0 },
  { code: "TJ", minLat: 36.5, maxLat: 41.0, minLng: 67.5, maxLng: 75.5 },
  { code: "TL", minLat: -9.5, maxLat: -8.0, minLng: 124.0, maxLng: 127.5 },
  { code: "TM", minLat: 35.0, maxLat: 43.0, minLng: 52.0, maxLng: 67.0 },
  { code: "TN", minLat: 30.0, maxLat: 38.0, minLng: 7.5, maxLng: 12.0 },
  { code: "TR", minLat: 35.5, maxLat: 42.5, minLng: 25.0, maxLng: 45.0 },
  { code: "TZ", minLat: -12.0, maxLat: -0.5, minLng: 29.5, maxLng: 41.5 },
  { code: "TW", minLat: 21.5, maxLat: 26.0, minLng: 119.0, maxLng: 123.0 },
  { code: "UA", minLat: 44.0, maxLat: 53.0, minLng: 22.0, maxLng: 40.5 },
  { code: "AE", minLat: 22.5, maxLat: 26.5, minLng: 51.5, maxLng: 57.0 },
  { code: "UG", minLat: -1.5, maxLat: 4.5, minLng: 29.5, maxLng: 35.5 },
  { code: "US", minLat: 24.0, maxLat: 50.0, minLng: -128.0, maxLng: -66.0 },
  { code: "UY", minLat: -35.5, maxLat: -30.0, minLng: -58.5, maxLng: -53.0 },
  { code: "UZ", minLat: 37.0, maxLat: 46.0, minLng: 56.0, maxLng: 73.5 },
  { code: "VE", minLat: 0.5, maxLat: 13.5, minLng: -73.5, maxLng: -59.5 },
  { code: "VN", minLat: 8.0, maxLat: 24.0, minLng: 102.0, maxLng: 110.0 },
  { code: "YE", minLat: 12.0, maxLat: 19.5, minLng: 42.0, maxLng: 55.5 },
  { code: "ZM", minLat: -18.5, maxLat: -8.0, minLng: 21.5, maxLng: 34.0 },
  { code: "ZW", minLat: -23.0, maxLat: -15.0, minLng: 25.0, maxLng: 34.0 },
  { code: "BT", minLat: 26.5, maxLat: 28.5, minLng: 88.5, maxLng: 92.5 },
  { code: "AD", minLat: 42.0, maxLat: 43.0, minLng: 1.0, maxLng: 2.0 },
  { code: "LI", minLat: 47.0, maxLat: 47.5, minLng: 9.3, maxLng: 10.0 },
];

const WATER_BOXES = [
  { minLat: -90, maxLat: -60, minLng: -180, maxLng: 180 },
  { minLat: 72, maxLat: 90, minLng: -180, maxLng: 180 },
  { minLat: -90, maxLat: 90, minLng: -100, maxLng: -15 },
  { minLat: -90, maxLat: 90, minLng: 145, maxLng: 180 },
  { minLat: -40, maxLat: 30, minLng: 18, maxLng: 55 },
  { minLat: -35, maxLat: 30, minLng: 55, maxLng: 100 },
  { minLat: 30, maxLat: 46, minLng: -6, maxLng: 42 },
  { minLat: 40, maxLat: 48, minLng: 27, maxLng: 42 },
  { minLat: 36, maxLat: 47, minLng: 46, maxLng: 55 },
  { minLat: 53, maxLat: 66, minLng: 10, maxLng: 30 },
  { minLat: 12, maxLat: 31, minLng: 32, maxLng: 58 },
  { minLat: 8, maxLat: 32, minLng: -100, maxLng: -60 },
  { minLat: 41, maxLat: 50, minLng: -92, maxLng: -76 },
  { minLat: -40, maxLat: 8, minLng: 95, maxLng: 105 },
  { minLat: -12, maxLat: 8, minLng: 105, maxLng: 130 },
  { minLat: 5, maxLat: 25, minLng: 105, maxLng: 130 },
];

const DESERT_BOXES = [
  { minLat: 14, maxLat: 35, minLng: -17, maxLng: 35 },
  { minLat: 16, maxLat: 33, minLng: 35, maxLng: 60 },
  { minLat: 37, maxLat: 50, minLng: 95, maxLng: 118 },
  { minLat: 30, maxLat: 45, minLng: 58, maxLng: 75 },
  { minLat: 22, maxLat: 30, minLng: 68, maxLng: 76 },
  { minLat: -28, maxLat: -18, minLng: 11, maxLng: 25 },
  { minLat: -40, maxLat: -18, minLng: -70, maxLng: -68 },
  { minLat: -30, maxLat: -20, minLng: 115, maxLng: 130 },
  { minLat: 44, maxLat: 55, minLng: 50, maxLng: 87 },
];

const MOUNTAIN_BOXES = [
  { minLat: 26, maxLat: 36, minLng: 70, maxLng: 100 },
  { minLat: 36, maxLat: 44, minLng: 70, maxLng: 80 },
  { minLat: 38, maxLat: 46, minLng: 38, maxLng: 52 },
  { minLat: -55, maxLat: 12, minLng: -80, maxLng: -68 },
  { minLat: 30, maxLat: 60, minLng: -125, maxLng: -100 },
  { minLat: 35, maxLat: 45, minLng: -120, maxLng: -100 },
  { minLat: 35, maxLat: 45, minLng: -5, maxLng: 10 },
];

export const MOUNTAIN_COUNTRIES = new Set([
  "NP", "BT", "AD", "LI", "MC", "SM", "AF", "KG", "TJ", "MN",
  "CH", "AT", "SK", "SI", "GE", "AM", "AZ", "TM", "UZ", "KZ",
]);

function inBox(lat: number, lng: number, boxes: typeof WATER_BOXES): boolean {
  for (const b of boxes) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return true;
  }
  return false;
}

export function getCountryCode(lat: number, lng: number): string {
  for (const c of COUNTRY_BOXES) {
    if (lat >= c.minLat && lat <= c.maxLat && lng >= c.minLng && lng <= c.maxLng) return c.code;
  }
  return "XX";
}

export function isBlockedTerrain(lat: number, lng: number, countryCode: string): boolean {
  if (MOUNTAIN_COUNTRIES.has(countryCode)) return false;
  return (
    inBox(lat, lng, WATER_BOXES) ||
    inBox(lat, lng, DESERT_BOXES) ||
    inBox(lat, lng, MOUNTAIN_BOXES)
  );
}
