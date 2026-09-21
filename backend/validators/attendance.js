const { z } = require('zod');
const { objectId, pagination } = require('./common');

// A browser position fix. The distance is never accepted from the client.
const position = {
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  accuracy: z.number().min(0, 'Accuracy cannot be negative').max(1_000_000, 'Accuracy is out of range'),
};

// The token's shape and signature are judged by the QR service (INVALID_QR / QR_EXPIRED);
// here it only has to be a reasonably sized string.
const checkIn = z.strictObject({ token: z.string().min(1, 'The QR token is required').max(200), ...position });

// Check-out needs no QR token.
const checkOut = z.strictObject(position);

// A volunteer's history is always their own, so only admins may pick a volunteer.
const historyQuery = { ...pagination, activity: objectId.optional() };
const historyForVolunteer = z.strictObject(historyQuery);
const historyForAdmin = z.strictObject({ ...historyQuery, volunteer: objectId.optional() });

module.exports = { checkIn, checkOut, historyForVolunteer, historyForAdmin };
