// Express 4 does not forward rejected promises from async handlers to the error
// middleware. Wrapping a handler makes any thrown error reach errorHandler.
module.exports = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
