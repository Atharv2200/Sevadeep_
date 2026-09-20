const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sevadeep-ngo';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/verification', require('./routes/verification'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sevadeep NGO API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
