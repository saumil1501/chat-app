// server/routes/admin.js
const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user?.badges?.includes('admin')) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// @route   GET /api/admin/stats
// @desc    Get admin statistics
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const totalRooms = await Room.countDocuments();
    const totalMessages = await Message.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        onlineUsers,
        totalRooms,
        totalMessages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users for moderation
router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/ban-user/:userId
// @desc    Ban a user
router.post('/ban-user/:userId', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBanned: true },
      { new: true }
    );
    res.json({ success: true, message: 'User banned', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/unban-user/:userId
// @desc    Unban a user
router.post('/unban-user/:userId', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBanned: false },
      { new: true }
    );
    res.json({ success: true, message: 'User unbanned', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/delete-message/:messageId
// @desc    Delete a message
router.delete('/delete-message/:messageId', authenticate, isAdmin, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/delete-room/:roomId
// @desc    Delete a room
router.delete('/delete-room/:roomId', authenticate, isAdmin, async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.roomId);
    await Message.deleteMany({ room: req.params.roomId });
    res.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;