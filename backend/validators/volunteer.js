const { z } = require('zod');
const { objectId, phone, name, pagination } = require('./common');

const idParams = z.strictObject({ id: objectId });

// Only the profile fields a volunteer may edit. Email lives on User; volunteerId is immutable.
const updateMe = z
  .strictObject({ name: name.optional(), phone: phone.optional() })
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update');

const setStatus = z.strictObject({ status: z.enum(['ACTIVE', 'SUSPENDED']) });

const list = z.strictObject({
  ...pagination,
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

module.exports = { idParams, updateMe, setStatus, list };
