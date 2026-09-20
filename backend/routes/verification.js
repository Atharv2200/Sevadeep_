const express = require('express');
const router = express.Router();
const Contribution = require('../models/Contribution');

// Get all pending contributions for verification
router.get('/pending', async (req, res) => {
  try {
    const contributions = await Contribution.find({ status: 'pending' }).sort({ submittedDate: -1 });
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all verified contributions
router.get('/verified', async (req, res) => {
  try {
    const contributions = await Contribution.find({ status: 'verified' }).sort({ verifiedDate: -1 });
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all rejected contributions
router.get('/rejected', async (req, res) => {
  try {
    const contributions = await Contribution.find({ status: 'rejected' }).sort({ rejectedDate: -1 });
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve contribution
router.put('/approve/:id', async (req, res) => {
  try {
    const contribution = await Contribution.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'verified',
        verifiedDate: new Date()
      },
      { new: true }
    );
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }
    
    // Update volunteer total hours
    const Volunteer = require('../models/Volunteer');
    await Volunteer.findOneAndUpdate(
      { volunteerId: contribution.volunteerId },
      { $inc: { totalHours: contribution.hours } }
    );
    
    res.json(contribution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Reject contribution
router.put('/reject/:id', async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const contribution = await Contribution.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        rejectedDate: new Date(),
        rejectionReason
      },
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

// Get verification statistics
router.get('/stats', async (req, res) => {
  try {
    const pending = await Contribution.countDocuments({ status: 'pending' });
    const verified = await Contribution.countDocuments({ status: 'verified' });
    const rejected = await Contribution.countDocuments({ status: 'rejected' });
    
    const totalHoursResult = await Contribution.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ]);
    const totalHours = totalHoursResult[0]?.total || 0;
    
    res.json({
      pending,
      verified,
      rejected,
      totalHours
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
