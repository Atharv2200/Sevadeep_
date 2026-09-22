const { z } = require('zod');
const { objectId, pagination } = require('./common');
const { STATUSES, HOURS_STEP, MAX_HOURS, LIMITS } = require('../config/contribution');

const idParams = z.strictObject({ id: objectId });
const photoParams = z.strictObject({ id: objectId, photoId: objectId });

// Multi-line text: newlines and tabs are fine, other control characters are not.
const block = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .refine((value) => !/[^\P{Cc}\n\r\t]/u.test(value), 'Contains invalid characters');

const description = block(LIMITS.description.max).refine((value) => value.length > 0, 'This field is required');
const note = block(LIMITS.reviewNote.max);

// The admin's call, never the volunteer's: 0.25-hour steps, positive, capped at MAX_HOURS.
const approvedHours = z
  .number()
  .positive('approvedHours must be greater than 0')
  .max(MAX_HOURS, `approvedHours cannot exceed ${MAX_HOURS}`)
  .refine((value) => Number.isInteger(value / HOURS_STEP), `approvedHours must be in ${HOURS_STEP}-hour increments`);

// Only what a volunteer may submit: the attendance they are reporting on, and a description.
const create = z.strictObject({ attendance: objectId, description });

// Only the description may be edited, and only while PENDING (enforced by the service).
const update = z.strictObject({ description });

// approvedHours is required to verify and forbidden when rejecting. `revision` guards
// against reviewing a version the admin never actually saw.
const review = z
  .strictObject({
    status: z.enum(['VERIFIED', 'REJECTED']),
    approvedHours: approvedHours.optional(),
    note: note.optional(),
    revision: z.number().int().min(0),
  })
  .superRefine((body, ctx) => {
    if (body.status === 'VERIFIED' && body.approvedHours === undefined) {
      ctx.addIssue({ code: 'custom', path: ['approvedHours'], message: 'approvedHours is required to verify a contribution' });
    }
    if (body.status === 'REJECTED' && body.approvedHours !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['approvedHours'], message: 'approvedHours is not allowed when rejecting' });
    }
  });

const listQuery = { ...pagination, activity: objectId.optional(), status: z.enum(STATUSES).optional() };
const listForVolunteer = z.strictObject(listQuery);
const listForAdmin = z.strictObject({ ...listQuery, volunteer: objectId.optional() });

module.exports = { idParams, photoParams, create, update, review, listForVolunteer, listForAdmin };
