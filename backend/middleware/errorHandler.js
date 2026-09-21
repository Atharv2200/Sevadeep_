const { isProduction } = require('../config/env');

// Unmatched routes.
function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

// Central error handler: maps known errors to safe client messages.
// Internal details (stack traces, driver messages) are logged, never sent.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = 'Internal server error';

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const fields = Object.keys(err.keyPattern || {});
    message = fields.length ? `Duplicate value for: ${fields.join(', ')}` : 'Duplicate value';
  }

  if (status === 500) {
    console.error(isProduction ? err.message : err);
  }

  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
