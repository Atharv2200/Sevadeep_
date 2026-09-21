const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id');

// Trimmed and lower-cased before the format check, so stored emails are canonical.
const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address'));

// bcrypt only uses the first 72 bytes, so longer passwords would be silently truncated.
const newPassword = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes');

// Accepts the input as typed (spaces, dashes, brackets, leading +) but needs 7-15 digits.
const phone = z
  .string()
  .trim()
  .max(20, 'Phone number is too long')
  .regex(/^\+?[0-9][0-9 ()-]*$/, 'Enter a valid phone number')
  .refine((value) => {
    const digits = value.replace(/\D/g, '').length;
    return digits >= 7 && digits <= 15;
  }, 'Enter a valid phone number');

const name = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .refine((value) => !/\p{Cc}/u.test(value), 'Name contains invalid characters');

// Query strings arrive as text, hence coerce. Limit is capped at 100.
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

module.exports = { objectId, email, newPassword, phone, name, pagination };
