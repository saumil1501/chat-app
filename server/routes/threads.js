// server/routes/threads.js
const express = require('express');
const Message = require('../models/Message');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @route   GET /api/threads/:messageId
// @desc    Get all replies for a message
router.get('/:messageId', authenticate, asyncHandler(async (req, res) => {
  const replies = await Message.find({
    parentMessage: req.params.messageId,
  })
    .populate('sender', 'username avatar')
    .sort({ createdAt: 1 });

  res.json({ success: true, replies });
}));

// @route   POST /api/threads/:messageId/reply
// @desc    Reply to a message
router.post('/:messageId/reply', authenticate, asyncHandler(async (req, res) => {
  const { content, roomId } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ message: 'Reply content required' });
  }

  // Verify parent message exists
  const parentMessage = await Message.findById(req.params.messageId);
  if (!parentMessage) {
    return res.status(404).json({ message: 'Parent message not found' });
  }

  // Create reply
  const reply = await Message.create({
    content: content.trim(),
    sender: req.user._id,
    room: roomId || parentMessage.room,
    parentMessage: req.params.messageId,
  });

  await reply.populate('sender', 'username avatar');

  // Update parent message thread count
  await Message.findByIdAndUpdate(
    req.params.messageId,
    { $inc: { threadCount: 1 } }
  );

  res.status(201).json({ success: true, reply });
}));

module.exports = router;