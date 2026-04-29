// server/models/CallHistory.js
const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // For group calls
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  },
  // Direct message or room call
  callType: {
    type: String,
    enum: ['dm', 'group'],
    default: 'dm',
  },
  // Video or voice
  mediaType: {
    type: String,
    enum: ['video', 'voice'],
    required: true,
  },
  // Call duration in seconds
  duration: {
    type: Number,
    default: 0,
  },
  // Call status
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'connected', 'ended', 'missed', 'declined'],
    default: 'initiated',
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('CallHistory', callHistorySchema);