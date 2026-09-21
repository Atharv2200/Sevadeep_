const { z } = require('zod');
const AppError = require('../utils/AppError');

// Every part defaults to "no fields allowed", so a route that forgets to declare
// its input rejects it instead of silently accepting arbitrary data.
const noFields = z.strictObject({});

// Turn a Zod issue into flat { path, message } entries. Unknown keys are reported
// one per key so the client can see exactly which fields were rejected.
function toErrors(part, issue) {
  const base = [part, ...issue.path];
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((key) => ({ path: [...base, key].join('.'), message: 'Unknown field' }));
  }
  return [{ path: base.join('.'), message: issue.message }];
}

// Validates and replaces req.body / req.params / req.query with the parsed values.
// Schemas should be z.strictObject(...) so unexpected fields are rejected, not stripped.
function validate({ body = noFields, params = noFields, query = noFields } = {}) {
  return (req, res, next) => {
    const parsed = {};
    const errors = [];

    for (const [part, schema] of [['body', body], ['params', params], ['query', query]]) {
      const result = schema.safeParse(req[part]);
      if (result.success) {
        parsed[part] = result.data;
      } else {
        errors.push(...result.error.issues.flatMap((issue) => toErrors(part, issue)));
      }
    }

    if (errors.length > 0) {
      return next(new AppError(400, 'Validation failed', { code: 'VALIDATION_ERROR', errors }));
    }

    req.body = parsed.body;
    req.params = parsed.params;
    req.query = parsed.query;
    return next();
  };
}

module.exports = validate;
