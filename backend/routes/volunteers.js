const express = require('express');
const router = express.Router();
const Volunteer = require('../models/Volunteer');

// Get all volunteers
router.get('/', async (req, res) => {
  try {
    const volunteers = await Volunteer.find();
    res.json(volunteers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single volunteer by ID
router.get('/:id', async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ volunteerId: req.params.id });
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json(volunteer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new volunteer
router.post('/', async (req, res) => {
  try {
    const volunteer = new Volunteer(req.body);
    const savedVolunteer = await volunteer.save();
    res.status(201).json(savedVolunteer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update volunteer
router.put('/:id', async (req, res) => {
  try {
    const volunteer = await Volunteer.findOneAndUpdate(
      { volunteerId: req.params.id },
      req.body,
      { new: true }
    );
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json(volunteer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete volunteer
router.delete('/:id', async (req, res) => {
  try {
    const volunteer = await Volunteer.findOneAndDelete({ volunteerId: req.params.id });
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json({ message: 'Volunteer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
