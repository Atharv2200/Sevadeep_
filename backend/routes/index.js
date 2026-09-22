const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/admins', require('./admins'));
router.use('/volunteers', require('./volunteers'));
router.use('/activities', require('./activities'));
router.use('/attendance', require('./attendance'));
router.use('/contributions', require('./contributions'));
router.use('/stats', require('./stats'));

// Public health check.
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sevadeep NGO API is running' });
});

module.exports = router;
