const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));

// Public health check.
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sevadeep NGO API is running' });
});

module.exports = router;
