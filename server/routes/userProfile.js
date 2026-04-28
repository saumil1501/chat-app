// server/routes/userProfile.js
const express = require('express');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/user/profile/:userId
// @desc    Get user public profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      '-password'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/user/me
// @desc    Get current user profile
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @route   PUT /api/user/profile
// @desc    Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const {
      bio,
      statusMessage,
      timezone,
      phone,
      website,
      location,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        bio,
        statusMessage,
        timezone,
        phone,
        website,
        location,
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/user/status
// @desc    Update user status
router.put('/status', authenticate, async (req, res) => {
  try {
    const { status, statusMessage } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { status, statusMessage },
      { new: true }
    ).select('-password');

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/user/search
// @desc    Search users by username or email
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Query too short' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: req.user._id },
    })
      .select('username avatar bio isOnline status')
      .limit(10);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;