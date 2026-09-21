const mongoose = require('mongoose');
const connectDB = require('../../config/db');

// Connects to the test database (config/env.js guarantees its name ends in "-test").
async function connect() {
  await connectDB();
}

// Empties every collection but keeps the indexes, so uniqueness rules stay in force.
async function reset() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function disconnect() {
  await mongoose.disconnect();
}

module.exports = { connect, reset, disconnect };
