const EARTH_RADIUS_METERS = 6371000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Great-circle distance in metres between two { latitude, longitude } points
// (Haversine formula, spherical Earth). Attendance evidence, not surveying: the
// spherical model is off by well under a metre at the distances that matter here.
function distanceMeters(a, b) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

module.exports = { distanceMeters, EARTH_RADIUS_METERS };
