// server/routes/calls.js
const express = require('express');
const CallHistory = require('../models/CallHistory');
const authenticate = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/calls/history
// @desc    Get call history for current user
router.get('/history', authenticate, async (req, res) => {
  try {
    const callHistory = await CallHistory.find({
      $or: [
        { caller: req.user._id },
        { recipient: req.user._id },
      ],
    })
      .populate('caller', 'username avatar')
      .populate('recipient', 'username avatar')
      .populate('room', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, callHistory });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/calls/history/:userId
// @desc    Get call history with specific user
router.get('/history/:userId', authenticate, async (req, res) => {
  try {
    const callHistory = await CallHistory.find({
      $or: [
        { caller: req.user._id, recipient: req.params.userId },
        { caller: req.params.userId, recipient: req.user._id },
      ],
    })
      .populate('caller', 'username avatar')
      .populate('recipient', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, callHistory });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/calls
// @desc    Create call history entry
router.post('/', authenticate, async (req, res) => {
  try {
    const { recipientId, roomId, mediaType, callType } = req.body;

    const call = await CallHistory.create({
      caller: req.user._id,
      recipient: recipientId,
      room: roomId,
      mediaType,
      callType,
      status: 'initiated',
    });

    await call.populate('caller', 'username avatar');
    await call.populate('recipient', 'username avatar');

    res.status(201).json({ success: true, call });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/calls/:callId
// @desc    Update call (status, duration, etc.)
router.put('/:callId', authenticate, async (req, res) => {
  try {
    const { status, duration, endTime } = req.body;

    const call = await CallHistory.findByIdAndUpdate(
      req.params.callId,
      {
        status,
        duration,
        endTime: endTime ? new Date(endTime) : undefined,
      },
      { new: true }
    )
      .populate('caller', 'username avatar')
      .populate('recipient', 'username avatar');

    res.json({ success: true, call });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;