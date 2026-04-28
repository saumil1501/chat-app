// server/routes/search.js
const express = require('express');
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @route   GET /api/search/messages
// @desc    Search messages in rooms
router.get('/messages', authenticate, asyncHandler(async (req, res) => {
  const { q, roomId, page = 1, limit = 50 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ message: 'Search query must be at least 2 characters' });
  }

  let query = {
    content: { $regex: q, $options: 'i' }
  };

  if (roomId) {
    query.room = roomId;
  }

  const skip = (page - 1) * limit;

  const messages = await Message.find(query)
    .populate('sender', 'username avatar')
    .populate('room', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Message.countDocuments(query);

  res.json({
    success: true,
    messages,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
}));

// @route   GET /api/search/dm
// @desc    Search direct messages
router.get('/dm', authenticate, asyncHandler(async (req, res) => {
  const { q, userId, page = 1, limit = 50 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ message: 'Search query must be at least 2 characters' });
  }

  let query = {
    content: { $regex: q, $options: 'i' },
    $or: [
      { sender: req.user._id },
      { recipient: req.user._id }
    ]
  };

  if (userId) {
    query = {
      content: { $regex: q, $options: 'i' },
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ]
    };
  }

  const skip = (page - 1) * limit;

  const messages = await DirectMessage.find(query)
    .populate('sender', 'username avatar')
    .populate('recipient', 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await DirectMessage.countDocuments(query);

  res.json({
    success: true,
    messages,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
}));

// @route   GET /api/search/users
// @desc    Search users
router.get('/users', authenticate, asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ message: 'Search query must be at least 2 characters' });
  }

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ],
    _id: { $ne: req.user._id },
  })
    .select('username avatar isOnline email')
    .limit(20);

  res.json({ success: true, users });
}));

module.exports = router;