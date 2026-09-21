const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { distanceMeters, EARTH_RADIUS_METERS } = require('../utils/geo');

const near = (actual, expected, tolerance) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    assert.equal(distanceMeters({ latitude: 18.5204, longitude: 73.8567 }, { latitude: 18.5204, longitude: 73.8567 }), 0);
  });

  it('measures a degree of latitude as R * pi / 180', () => {
    near(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }), (EARTH_RADIUS_METERS * Math.PI) / 180, 1e-6);
  });

  it('is exact along a meridian at any latitude', () => {
    const metres = 250;
    const delta = (metres / EARTH_RADIUS_METERS) * (180 / Math.PI);
    near(distanceMeters({ latitude: 18.5204, longitude: 73.8567 }, { latitude: 18.5204 + delta, longitude: 73.8567 }), metres, 1e-6);
  });

  it('shrinks east-west distances with latitude', () => {
    const equator = distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    const pune = distanceMeters({ latitude: 18.5, longitude: 0 }, { latitude: 18.5, longitude: 1 });
    near(pune / equator, Math.cos((18.5 * Math.PI) / 180), 1e-3);
  });

  it('matches a known city pair (Pune to Mumbai is about 120 km)', () => {
    near(distanceMeters({ latitude: 18.5204, longitude: 73.8567 }, { latitude: 19.076, longitude: 72.8777 }) / 1000, 119.5, 2);
  });

  it('is symmetric and handles antipodes and the date line', () => {
    const a = { latitude: 10, longitude: 179.9999 };
    const b = { latitude: 10, longitude: -179.9999 };
    assert.equal(distanceMeters(a, b), distanceMeters(b, a));
    assert.ok(distanceMeters(a, b) < 50);
    near(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 }), Math.PI * EARTH_RADIUS_METERS, 1e-3);
  });
});
