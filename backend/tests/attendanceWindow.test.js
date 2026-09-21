const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { attendanceWindow } = require('../utils/attendanceWindow');

const START = new Date('2026-10-04T09:00:00.000Z');
const END = new Date('2026-10-04T12:00:00.000Z');
const OPENS = new Date('2026-10-04T08:30:00.000Z');
const CLOSES = new Date('2026-10-04T12:30:00.000Z');

const activity = (overrides = {}) => ({
  status: 'OPEN',
  startsAt: START,
  endsAt: END,
  attendanceOpensMinutesBefore: 30,
  attendanceClosesMinutesAfter: 30,
  ...overrides,
});

const at = (base, ms) => new Date(base.getTime() + ms);

describe('attendanceWindow', () => {
  it('computes opensAt and closesAt from the configured minutes', () => {
    const window = attendanceWindow(activity(), START);
    assert.equal(window.opensAt.toISOString(), OPENS.toISOString());
    assert.equal(window.closesAt.toISOString(), CLOSES.toISOString());
  });

  it('honours non-default and zero minutes', () => {
    const window = attendanceWindow(activity({ attendanceOpensMinutesBefore: 90, attendanceClosesMinutesAfter: 0 }), START);
    assert.equal(window.opensAt.toISOString(), '2026-10-04T07:30:00.000Z');
    assert.equal(window.closesAt.toISOString(), END.toISOString());
  });

  it('is closed one millisecond before opensAt, open exactly at it and just after', () => {
    assert.equal(attendanceWindow(activity(), at(OPENS, -1)).isOpen, false);
    assert.equal(attendanceWindow(activity(), OPENS).isOpen, true);
    assert.equal(attendanceWindow(activity(), at(OPENS, 1)).isOpen, true);
  });

  it('is open just before closesAt and exactly at it, closed one millisecond after', () => {
    assert.equal(attendanceWindow(activity(), at(CLOSES, -1)).isOpen, true);
    assert.equal(attendanceWindow(activity(), CLOSES).isOpen, true);
    assert.equal(attendanceWindow(activity(), at(CLOSES, 1)).isOpen, false);
  });

  it('is only ever open for OPEN activities', () => {
    for (const status of ['DRAFT', 'CLOSED', 'CANCELLED']) {
      assert.equal(attendanceWindow(activity({ status }), START).isOpen, false, status);
    }
  });

  it('defaults to the current time', () => {
    const now = Date.now();
    const window = attendanceWindow(
      activity({ startsAt: new Date(now + 10 * 60 * 1000), endsAt: new Date(now + 70 * 60 * 1000) })
    );
    assert.equal(window.isOpen, true);
  });
});
