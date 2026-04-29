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

// server/routes/directMessages.js

// @route   GET /api/dm
// @desc    Get all DM conversations (list of users)
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('📥 Fetching DM conversations for user:', req.user._id);

    // 1. Find all messages involving the current user
    const messages = await DirectMessage.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username avatar isOnline')
      .populate('recipient', 'username avatar isOnline');

    console.log(`✅ Found ${messages.length} total DM messages`);

    if (messages.length === 0) {
      return res.json({ success: true, conversations: [] });
    }

    // 2. Group by conversation partner manually (more reliable than aggregation)
    const conversationMap = new Map();

    messages.forEach((msg) => {
      // Determine who the "other" person is
      const isSender = msg.sender._id.toString() === req.user._id.toString();
      const partnerId = isSender ? msg.recipient._id.toString() : msg.sender._id.toString();
      const partnerUser = isSender ? msg.recipient : msg.sender;

      // Only keep the first message we see for this partner (since we sorted by date desc)
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          _id: partnerId,
          user: partnerUser,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: 0,
        });
      }

      // Count unread messages (messages sent TO current user that are not read)
      if (!isSender && !msg.isRead) {
        const conv = conversationMap.get(partnerId);
        conv.unreadCount += 1;
      }
    });

    const conversationList = Array.from(conversationMap.values());
    
    console.log(`✅ Grouped into ${conversationList.length} conversations`);

    res.json({ success: true, conversations: conversationList });
  } catch (error) {
    console.error('❌ Error fetching DM conversations:', error);
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