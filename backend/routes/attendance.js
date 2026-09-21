const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// Get all attendance records
router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query;
    let query = {};
    if (date) {
      query.checkIn = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      };
    }
    const attendance = await Attendance.find(query).sort({ checkIn: -1 });
    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

// Get attendance by volunteer ID
router.get('/volunteer/:volunteerId', async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ volunteerId: req.params.volunteerId }).sort({ checkIn: -1 });
    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

// Create new attendance record (check-in)
router.post('/', async (req, res, next) => {
  try {
    const attendance = new Attendance(req.body);
    attendance.checkIn = new Date();
    attendance.status = 'checked-in';
    const savedAttendance = await attendance.save();
    res.status(201).json(savedAttendance);
  } catch (error) {
    next(error);
  }
});

// Update attendance (check-out)
router.put('/:id', async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { 
        checkOut: new Date(),
        status: 'completed',
        ...req.body
      },
      { new: true }
    );
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

// Delete attendance record
router.delete('/:id', async (req, res, next) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
