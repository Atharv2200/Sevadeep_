const express = require('express');
const router = express.Router();
const Volunteer = require('../models/Volunteer');

// Get all volunteers
router.get('/', async (req, res, next) => {
  try {
    const volunteers = await Volunteer.find();
    res.json(volunteers);
  } catch (error) {
    next(error);
  }
});

// Get single volunteer by ID
router.get('/:id', async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ volunteerId: req.params.id });
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json(volunteer);
  } catch (error) {
    next(error);
  }
});

// Create new volunteer
router.post('/', async (req, res, next) => {
  try {
    const volunteer = new Volunteer(req.body);
    const savedVolunteer = await volunteer.save();
    res.status(201).json(savedVolunteer);
  } catch (error) {
    next(error);
  }
});

// Update volunteer
router.put('/:id', async (req, res, next) => {
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
    next(error);
  }
});

// Delete volunteer
router.delete('/:id', async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOneAndDelete({ volunteerId: req.params.id });
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json({ message: 'Volunteer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
