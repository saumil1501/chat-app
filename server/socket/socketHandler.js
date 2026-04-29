// server/socket/socketHandler.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');

const connectedUsers = new Map(); // userId -> socketId

const socketHandler = (io) => {
  // Middleware to authenticate socket connections

  // Store active calls
const activeCalls = new Map(); // callId -> { caller, recipient, socketIds }

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // Store connected user
    connectedUsers.set(socket.user._id.toString(), socket.id);

    // Update user online status
    await User.findByIdAndUpdate(socket.user._id, { isOnline: true });

    // Broadcast online users
    io.emit('users:online', Array.from(connectedUsers.keys()));

    // Notify others that this user is online
    socket.broadcast.emit('user:status', {
      userId: socket.user._id,
      isOnline: true,
    });

    // ==================== ROOM EVENTS ====================

    // Join a room
    socket.on('room:join', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        socket.join(roomId);
        console.log(`📌 ${socket.user.username} joined room: ${room.name}`);

        // Notify room members
        socket.to(roomId).emit('room:userJoined', {
          user: socket.user,
          roomId,
          message: `${socket.user.username} joined the room`,
        });

        socket.emit('room:joined', { roomId, roomName: room.name });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave a room
    socket.on('room:leave', async ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('room:userLeft', {
        user: socket.user,
        roomId,
        message: `${socket.user.username} left the room`,
      });
    });

    // ==================== MESSAGE EVENTS ====================

    // Send message
    socket.on('message:send', async ({ roomId, content, messageType = 'text' }) => {
      try {
        if (!content?.trim()) return;

        // Save message to database
        const message = await Message.create({
          content: content.trim(),
          sender: socket.user._id,
          room: roomId,
          messageType,
        });

        // Populate sender info
        await message.populate('sender', 'username avatar');

        // Emit message to all users in the room
        io.to(roomId).emit('message:receive', {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          room: roomId,
          messageType: message.messageType,
          createdAt: message.createdAt,
          isEdited: false,
        });

        console.log(`💬 Message from ${socket.user.username} in room ${roomId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Edit message
    socket.on('message:edit', async ({ messageId, content }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return socket.emit('error', { message: 'Message not found' });

        // Only sender can edit
        if (message.sender.toString() !== socket.user._id.toString()) {
          return socket.emit('error', { message: 'Unauthorized to edit this message' });
        }

        message.content = content;
        message.isEdited = true;
        await message.save();
        await message.populate('sender', 'username avatar');

        io.to(message.room.toString()).emit('message:edited', {
          messageId,
          content,
          isEdited: true,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete message
    socket.on('message:delete', async ({ messageId, roomId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return socket.emit('error', { message: 'Message not found' });

        if (message.sender.toString() !== socket.user._id.toString()) {
          return socket.emit('error', { message: 'Unauthorized to delete this message' });
        }

        await Message.findByIdAndDelete(messageId);

        io.to(roomId).emit('message:deleted', { messageId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // ==================== TYPING EVENTS ====================

    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:update', {
        userId: socket.user._id,
        username: socket.user.username,
        isTyping: true,
        roomId,
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:update', {
        userId: socket.user._id,
        username: socket.user.username,
        isTyping: false,
        roomId,
      });
    });

    // ==================== DIRECT MESSAGES ====================

    socket.on('dm:send', async ({ recipientId, content }) => {
      try {
        const DirectMessage = require('../models/DirectMessage');
        
        const message = await DirectMessage.create({
          sender: socket.user._id,
          recipient: recipientId,
          content,
        });

        await message.populate('sender', 'username avatar');

        // Send to recipient if online
        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('dm:receive', message);
        }

        // Send to sender
        socket.emit('dm:sent', message);

        console.log(`💌 DM from ${socket.user.username} to ${recipientId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send DM' });
      }
    });

    socket.on('dm:typing', ({ recipientId }) => {
      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('dm:userTyping', {
          userId: socket.user._id,
          username: socket.user.username,
        });
      }
    });

    socket.on('dm:read', async ({ messageId }) => {
      try {
        const DirectMessage = require('../models/DirectMessage');
        await DirectMessage.findByIdAndUpdate(messageId, { isRead: true });
      } catch (error) {
        console.error('Error marking DM as read');
      }
    });

    // ==================== CALL EVENTS ====================

    socket.on('call:initiate', async ({ recipientId, callType, mediaType, callId }) => {
      try {
        console.log(`📞 Call initiated from ${socket.user.username} to ${recipientId}`);

        const recipientSocketId = connectedUsers.get(recipientId);
        if (!recipientSocketId) {
          return socket.emit('error', { message: 'User is offline' });
        }

        // Store active call
        activeCalls.set(callId, {
          caller: socket.user._id,
          callerSocket: socket.id,
          recipient: recipientId,
          recipientSocket: recipientSocketId,
          callType,
          mediaType,
          status: 'ringing',
        });

        // Send incoming call notification
        io.to(recipientSocketId).emit('call:incoming', {
          callId,
          callerId: socket.user._id,
          callerName: socket.user.username,
          callerAvatar: socket.user.avatar,
          callType,
          mediaType,
        });

        console.log(`📞 Incoming call notification sent to ${recipientId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call:accept', ({ callId }) => {
      try {
        console.log(`✅ Call ${callId} accepted`);

        const call = activeCalls.get(callId);
        if (!call) return socket.emit('error', { message: 'Call not found' });

        // Notify caller that call was accepted
        io.to(call.callerSocket).emit('call:accepted', { callId });

        // Update call status
        call.status = 'connected';

        console.log(`✅ ${socket.user.username} accepted the call`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to accept call' });
      }
    });

    socket.on('call:reject', ({ callId, reason }) => {
      try {
        console.log(`❌ Call ${callId} rejected`);

        const call = activeCalls.get(callId);
        if (!call) return;

        io.to(call.callerSocket).emit('call:rejected', { callId, reason });
        activeCalls.delete(callId);

        console.log(`❌ Call rejected by ${socket.user.username}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to reject call' });
      }
    });

    // WebRTC signaling - unified signal forwarding
    socket.on('call:webrtc-signal', ({ callId, signal }) => {
      try {
        const call = activeCalls.get(callId);
        if (!call) return;

        const targetSocket = socket.id === call.callerSocket ? call.recipientSocket : call.callerSocket;
        io.to(targetSocket).emit('call:webrtc-signal', { callId, signal });

        console.log(`📡 WebRTC signal forwarded for call ${callId}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to forward WebRTC signal' });
      }
    });

    socket.on('call:end', ({ callId, duration }) => {
      try {
        console.log(`📞 Call ${callId} ended`);

        const call = activeCalls.get(callId);
        if (!call) return;

        const targetSocket = socket.id === call.callerSocket ? call.recipientSocket : call.callerSocket;
        io.to(targetSocket).emit('call:ended', { callId, duration });

        activeCalls.delete(callId);

        console.log(`📞 Call ${callId} ended after ${duration} seconds`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to end call' });
      }
    });

    socket.on('call:cancel', ({ callId }) => {
      try {
        console.log(`❌ Call ${callId} cancelled`);

        const call = activeCalls.get(callId);
        if (!call) return;

        const targetSocket = socket.id === call.callerSocket ? call.recipientSocket : call.callerSocket;
        io.to(targetSocket).emit('call:cancelled', { callId });

        activeCalls.delete(callId);
      } catch (error) {
        socket.emit('error', { message: 'Failed to cancel call' });
      }
    });

    // Disconnect: clean up active calls and user status
    socket.on('disconnect', async () => {
      try {
        console.log(`❌ User disconnected: ${socket.user.username}`);

        // Clean up connected users
        connectedUsers.delete(socket.user._id.toString());

        // Update DB status
        await User.findByIdAndUpdate(socket.user._id, {
          isOnline: false,
          lastSeen: Date.now(),
        });

        // Notify others
        io.emit('users:online', Array.from(connectedUsers.keys()));
        socket.broadcast.emit('user:status', {
          userId: socket.user._id,
          isOnline: false,
          lastSeen: new Date(),
        });

        // Clean up any active calls involving this socket
        for (const [callId, call] of activeCalls.entries()) {
          if (call.callerSocket === socket.id || call.recipientSocket === socket.id) {
            const otherSocket = call.callerSocket === socket.id ? call.recipientSocket : call.callerSocket;
            io.to(otherSocket).emit('call:ended', { callId, reason: 'User disconnected' });
            activeCalls.delete(callId);
          }
        }
      } catch (err) {
        console.error('Error during disconnect cleanup', err);
      }
    });
  });
};

module.exports = socketHandler;