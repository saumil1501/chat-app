// server/routes/dm.js
const express = require('express');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @route   GET /api/dm
// @desc    Get all DM conversations for the current user
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const conversations = await DirectMessage.find({
    $or: [{ sender: req.user._id }, { recipient: req.user._id }]
  })
    .populate('sender', 'username avatar isOnline')
    .populate('recipient', 'username avatar isOnline')
    .sort({ createdAt: -1 });

  // Group by conversation partner and get last message
  const conversationMap = new Map();

  conversations.forEach((msg) => {
    const otherUserId = msg.sender._id.equals(req.user._id) 
      ? msg.recipient._id 
      : msg.sender._id;
    const otherUser = msg.sender._id.equals(req.user._id) 
      ? msg.recipient 
      : msg.sender;

    if (!conversationMap.has(otherUserId.toString())) {
      conversationMap.set(otherUserId.toString(), {
        _id: otherUserId,
        user: otherUser,
        lastMessage: msg.content,
        unreadCount: !msg.isRead && !msg.recipient._id.equals(req.user._id) ? 0 : 1,
      });
    }
  });

  res.json({ success: true, conversations: Array.from(conversationMap.values()) });
}));

// @route   GET /api/dm/:userId
// @desc    Get messages with a specific user
router.get('/:userId', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const messages = await DirectMessage.find({
    $or: [
      { sender: req.user._id, recipient: req.params.userId },
      { sender: req.params.userId, recipient: req.user._id }
    ]
  })
    .populate('sender', 'username avatar')
    .populate('recipient', 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await DirectMessage.countDocuments({
    $or: [
      { sender: req.user._id, recipient: req.params.userId },
      { sender: req.params.userId, recipient: req.user._id }
    ]
  });

  res.json({
    success: true,
    messages: messages.reverse(),
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    }
  });
}));

// @route   POST /api/dm/:userId
// @desc    Send a direct message
router.post('/:userId', authenticate, asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  const recipient = await User.findById(req.params.userId);
  if (!recipient) {
    return res.status(404).json({ message: 'User not found' });
  }

  const message = await DirectMessage.create({
    sender: req.user._id,
    recipient: req.params.userId,
    content: content.trim(),
  });

  await message.populate('sender', 'username avatar');
  await message.populate('recipient', 'username avatar');

  res.status(201).json({ success: true, message });
}));

// @route   PATCH /api/dm/:messageId/read
// @desc    Mark a message as read
router.patch('/:messageId/read', authenticate, asyncHandler(async (req, res) => {
  const message = await DirectMessage.findById(req.params.messageId);

  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }

  if (!message.recipient.equals(req.user._id)) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  message.isRead = true;
  await message.save();

  res.json({ success: true, message });
}));

module.exports = router;
