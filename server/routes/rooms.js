// server/routes/rooms.js
const express = require('express');
const Room = require('../models/Room');
const Message = require('../models/Message');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @route   GET /api/rooms
// @desc    Get all rooms
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const rooms = await Room.find({ isPrivate: false })
    .populate('createdBy', 'username avatar')
    .populate('members', 'username avatar isOnline')
    .sort({ createdAt: -1 });
  res.json({ success: true, rooms });
}));

// @route   POST /api/rooms
// @desc    Create a room
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, description, isPrivate } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Room name is required.' });
  }

  const existingRoom = await Room.findOne({ name });
  if (existingRoom) {
    return res.status(400).json({ message: 'Room name already exists.' });
  }

  const room = await Room.create({
    name,
    description,
    isPrivate: isPrivate || false,
    createdBy: req.user._id,
    members: [req.user._id],
  });

  await room.populate('createdBy', 'username avatar');

  res.status(201).json({ success: true, room });
}));

// @route   GET /api/rooms/:roomId/messages
// @desc    Get messages for a room
router.get('/:roomId/messages', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const messages = await Message.find({ room: req.params.roomId })
    .populate('sender', 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Message.countDocuments({ room: req.params.roomId });

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

// @route   POST /api/rooms/:roomId/join
// @desc    Join a room
router.post('/:roomId/join', authenticate, asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found.' });
  }

  if (!room.members.includes(req.user._id)) {
    room.members.push(req.user._id);
    await room.save();
  }

  res.json({ success: true, room });
}));

module.exports = router;