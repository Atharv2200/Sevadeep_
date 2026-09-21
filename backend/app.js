const express = require('express');
const cors = require('cors');
const { corsOrigins } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');

// Middleware
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Routes
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/verification', require('./routes/verification'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sevadeep NGO API is running' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
