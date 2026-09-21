const mongoose = require('mongoose');
const { mongoUri } = require('./env');

// Resolves once connected; rejects if MongoDB cannot be reached quickly.
async function connectDB() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('MongoDB connected successfully');
}

module.exports = connectDB;
