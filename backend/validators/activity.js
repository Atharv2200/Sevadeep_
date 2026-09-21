const { z } = require('zod');
const { objectId, pagination } = require('./common');
const { STATUSES, CATEGORIES, LIMITS } = require('../config/activity');

const idParams = z.strictObject({ id: objectId });

// Single-line text: trimmed, no control characters.
const line = (max, min = 1) =>
  z
    .string()
    .trim()
    .min(min, min > 1 ? `Must be at least ${min} characters` : 'This field is required')
    .max(max, `Must be at most ${max} characters`)
    .refine((value) => !/\p{Cc}/u.test(value), 'Contains invalid characters');

// Multi-line text: newlines and tabs are fine, other control characters are not.
const block = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .refine((value) => !/[^\P{Cc}\n\r\t]/u.test(value), 'Contains invalid characters');

// ISO 8601 with a UTC offset ("2026-10-04T09:30:00.000Z"), parsed into a Date.
const timestamp = z.iso
  .datetime({ offset: true, message: 'Enter a valid date and time' })
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), 'Enter a valid date and time');

const attendanceMinutes = z.number().int().min(LIMITS.attendanceMinutes.min).max(LIMITS.attendanceMinutes.max);

const fields = {
  title: line(LIMITS.title.max, LIMITS.title.min),
  description: block(LIMITS.description.max).refine((value) => value.length > 0, 'This field is required'),
  category: z.enum(CATEGORIES),
  startsAt: timestamp,
  endsAt: timestamp,
  locationName: line(LIMITS.locationName.max),
  address: block(LIMITS.address.max),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  radiusMeters: z
    .number()
    .int('Radius must be a whole number of metres')
    .min(LIMITS.radiusMeters.min, `Radius must be at least ${LIMITS.radiusMeters.min} m`)
    .max(LIMITS.radiusMeters.max, `Radius must be at most ${LIMITS.radiusMeters.max} m`),
  instructions: block(LIMITS.instructions.max),
  attendanceOpensMinutesBefore: attendanceMinutes,
  attendanceClosesMinutesAfter: attendanceMinutes,
};

const required = ['title', 'description', 'category', 'startsAt', 'endsAt', 'locationName', 'latitude', 'longitude', 'radiusMeters'];
const base = z.strictObject(
  Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, required.includes(key) ? schema : schema.optional()]))
);

// Checks the start/end pair. Shared with the service, which re-runs it against the
// stored value when only one of the two is being changed.
function timeErrors(startsAt, endsAt) {
  if (endsAt <= startsAt) return [{ path: 'body.endsAt', message: 'The end must be after the start' }];
  if (endsAt - startsAt > LIMITS.maxDurationMs) return [{ path: 'body.endsAt', message: 'An activity can last at most 7 days' }];
  return [];
}

const create = base.superRefine((body, ctx) => {
  for (const issue of timeErrors(body.startsAt, body.endsAt)) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: issue.message });
});

// Partial updates. Status, createdBy and every other server-controlled field are unknown here.
const update = base
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update')
  .superRefine((body, ctx) => {
    if (!body.startsAt || !body.endsAt) return;
    for (const issue of timeErrors(body.startsAt, body.endsAt)) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: issue.message });
  });

const setStatus = z.strictObject({ status: z.enum(STATUSES) });

const listQuery = {
  ...pagination,
  category: z.enum(CATEGORIES).optional(),
  search: z.string().trim().max(100).optional(),
};
const listForVolunteer = z.strictObject(listQuery);
const listForAdmin = z.strictObject({ ...listQuery, status: z.enum(STATUSES).optional() });

module.exports = { idParams, create, update, setStatus, listForVolunteer, listForAdmin, timeErrors };
