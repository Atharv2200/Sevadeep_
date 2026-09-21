const mongoose = require('mongoose');
const { mongoUri, isTest } = require('./env');

// Filters are never built from raw client input, but if one ever is, operator
// objects such as { $ne: ... } are neutralised instead of executed.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

// Resolves once connected and every index exists; rejects if MongoDB cannot be
// reached quickly. Waiting for the indexes matters: rules such as "one attendance
// per volunteer per activity" are enforced by unique indexes, so none may be missing
// while requests are served.
async function connectDB() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await Promise.all(Object.values(require('../models')).map((model) => model.init()));
  if (!isTest) console.log('MongoDB connected successfully');
}

module.exports = connectDB;
