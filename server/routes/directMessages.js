// server/routes/directMessages.js
const express = require('express');
const DirectMessage = require('../models/DirectMessage');
const authenticate = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dm/:userId
// @desc    Get DM conversation with specific user
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Get messages between current user and target user
    const messages = await DirectMessage.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id },
      ],
    })
      .populate('sender', 'username avatar isOnline')
      .populate('recipient', 'username avatar isOnline')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DirectMessage.countDocuments({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id },
      ],
    });

    // Mark messages as read
    await DirectMessage.updateMany(
      { sender: req.params.userId, recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/dm
// @desc    Get all DM conversations (list of users)
router.get('/', authenticate, async (req, res) => {
  try {
    // Get distinct conversations
    const conversations = await DirectMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: mongoose.Types.ObjectId(req.user._id) },
            { recipient: mongoose.Types.ObjectId(req.user._id) },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', mongoose.Types.ObjectId(req.user._id)] },
              '$recipient',
              '$sender',
            ],
          },
          lastMessage: { $first: '$content' },
          lastMessageTime: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', mongoose.Types.ObjectId(req.user._id)] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Populate user details
    const User = require('../models/User');
    const conversationList = await Promise.all(
      conversations.map(async (conv) => {
        const user = await User.findById(conv._id).select(
          'username avatar isOnline'
        );
        return {
          ...conv,
          user,
        };
      })
    );

    res.json({ success: true, conversations: conversationList });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/dm/:userId
// @desc    Send DM to user
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Message content required' });
    }

    const message = await DirectMessage.create({
      sender: req.user._id,
      recipient: req.params.userId,
      content: content.trim(),
    });

    await message.populate('sender', 'username avatar isOnline');
    await message.populate('recipient', 'username avatar isOnline');

    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/dm/:messageId
// @desc    Edit DM
router.put('/:messageId', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await DirectMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/dm/:messageId
// @desc    Delete DM
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const message = await DirectMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await DirectMessage.findByIdAndDelete(req.params.messageId);
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// server/routes/directMessages.js - Fix the aggregation
const mongoose = require('mongoose');

// Replace the aggregation pipeline with:
router.get('/', authenticate, async (req, res) => {
  try {
    const messages = await DirectMessage.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100);

    // Group by conversation partner
    const conversationMap = new Map();

    messages.forEach((msg) => {
      const partnerId =
        msg.sender.toString() === req.user._id.toString()
          ? msg.recipient.toString()
          : msg.sender.toString();

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          _id: partnerId,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: msg.isRead ? 0 : 1,
        });
      }
    });

    const User = require('../models/User');
    const conversationList = await Promise.all(
      Array.from(conversationMap.entries()).map(async ([userId, conv]) => {
        const user = await User.findById(userId).select(
          'username avatar isOnline'
        );
        return {
          ...conv,
          user,
        };
      })
    );

    res.json({ success: true, conversations: conversationList });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});