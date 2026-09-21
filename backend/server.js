const { port } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start();
