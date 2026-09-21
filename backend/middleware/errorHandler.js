const { isTest } = require('../config/env');
const AppError = require('../utils/AppError');

// Unmatched routes.
function notFound(req, res) {
  res.status(404).json({ message: 'Route not found', code: 'NOT_FOUND' });
}

// Central error handler. Every response has the shape { message, code?, errors? }.
// Known errors map to safe client messages; internal details (stack traces,
// driver messages) are logged, never sent.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let body = { message: 'Internal server error' };

  if (err instanceof AppError) {
    status = err.status;
    body = { message: err.message };
    if (err.code) body.code = err.code;
    if (err.errors) body.errors = err.errors;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    body = { message: 'Invalid JSON in request body', code: 'INVALID_JSON' };
  } else if (err.type === 'entity.too.large') {
    status = 413;
    body = { message: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' };
  } else if (err.name === 'CastError') {
    status = 400;
    body = { message: 'Invalid identifier or value', code: 'VALIDATION_ERROR' };
  } else if (err.code === 11000) {
    // Routes that expect a duplicate translate it into a specific AppError first.
    status = 409;
    body = { message: 'Duplicate value', code: 'DUPLICATE' };
  }
  // A Mongoose ValidationError is deliberately not mapped: request input is
  // validated by Zod first, so reaching one means a server bug (500, logged).

  if (status === 500 && !isTest) {
    console.error(err);
  }

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
