// An error the API deliberately reports to the client.
// `code` is a stable machine-readable identifier; `errors` carries validation details.
class AppError extends Error {
  constructor(status, message, { code, errors } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

module.exports = AppError;
