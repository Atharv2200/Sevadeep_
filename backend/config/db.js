const mongoose = require('mongoose');
const { mongoUri, isTest } = require('./env');

// Filters are never built from raw client input, but if one ever is, operator
// objects such as { $ne: ... } are neutralised instead of executed.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

// Resolves once connected; rejects if MongoDB cannot be reached quickly.
async function connectDB() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  if (!isTest) console.log('MongoDB connected successfully');
}

module.exports = connectDB;
