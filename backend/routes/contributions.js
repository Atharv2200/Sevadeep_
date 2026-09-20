const express = require('express');
const router = express.Router();
const Contribution = require('../models/Contribution');

// Get all contributions
router.get('/', async (req, res) => {
  try {
    const { status, volunteerId } = req.query;
    let query = {};
    if (status) query.status = status;
    if (volunteerId) query.volunteerId = volunteerId;
    
    const contributions = await Contribution.find(query).sort({ submittedDate: -1 });
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single contribution by ID
router.get('/:id', async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }
    res.json(contribution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new contribution
router.post('/', async (req, res) => {
  try {
    const contribution = new Contribution({
      ...req.body,
      submittedDate: new Date()
    });
    const savedContribution = await contribution.save();
    res.status(201).json(savedContribution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update contribution
router.put('/:id', async (req, res) => {
  try {
    const contribution = await Contribution.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }
    res.json(contribution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete contribution
router.delete('/:id', async (req, res) => {
  try {
    const contribution = await Contribution.findByIdAndDelete(req.params.id);
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }
    res.json({ message: 'Contribution deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
