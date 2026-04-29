// client/src/components/Chat/DMChat.jsx
import { useState, useEffect, useRef } from 'react';
import { api } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useDM } from '../../context/DMContext';
import CallButton from '../Call/CallButton';
import toast from 'react-hot-toast';

const DMChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pendingMessagesRef = useRef(new Set()); // Track pending messages

  const { selectedUser, setSelectedUser } = useDM();
  const { socket } = useSocket();
  const { user } = useAuth();

  // Fetch messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      console.log('📥 Fetching messages for user:', selectedUser.username);
      fetchMessages();
      pendingMessagesRef.current.clear(); // Clear pending messages
    }
  }, [selectedUser?._id]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket listeners for incoming messages
  useEffect(() => {
    if (!socket || !selectedUser) {
      console.log('⚠️ Socket or selectedUser not available');
      return;
    }

    console.log('🔌 Setting up socket listeners for DMs');

    // ✅ Listen for incoming DM from other user
    const handleDMReceive = (message) => {
      console.log('💬 Received DM from other user:', message);
      
      // Only add message if it's from the currently selected user AND not a duplicate
      if (message.sender._id === selectedUser._id) {
        console.log('✅ Adding received message to chat');
        setMessages((prev) => {
          // Check if message already exists
          if (!prev.find((m) => m._id === message._id)) {
            return [...prev, message];
          }
          return prev;
        });
        
        // ✅ Mark as read immediately
        setTimeout(() => {
          socket.emit('dm:read', { messageId: message._id });
        }, 100);
      }
    };

    // ✅ Listen for typing indicator
    const handleDMTyping = () => {
      console.log('✍️ User is typing...');
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1500);
    };

    // ✅ Listen for sent message confirmation from server
    const handleDMSent = (message) => {
      console.log('✅ Server confirmed message sent:', message._id);
      
      // Replace the temporary message with the real one from server
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id.toString().startsWith('temp-') ? message : msg
        )
      );
      
      // Remove from pending
      pendingMessagesRef.current.delete(message._id);
    };

    socket.on('dm:receive', handleDMReceive);
    socket.on('dm:userTyping', handleDMTyping);
    socket.on('dm:sent', handleDMSent);

    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('dm:receive', handleDMReceive);
      socket.off('dm:userTyping', handleDMTyping);
      socket.off('dm:sent', handleDMSent);
    };
  }, [socket, selectedUser?._id, user?._id]);

  const fetchMessages = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      console.log('📡 Fetching DM messages from API');
      const { data } = await api.get(`/dm/${selectedUser._id}`);
      console.log('✅ Messages fetched:', data.messages.length);
      setMessages(data.messages);
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!selectedUser) {
      toast.error('No user selected');
      return;
    }

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      content: messageContent,
      sender: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
      },
      recipient: selectedUser._id,
      createdAt: new Date(),
      isEdited: false,
    };

    console.log('📤 Sending message:', messageContent);

    // Track this as a pending message
    pendingMessagesRef.current.add(tempId);

    // ✅ Immediately add message to UI (optimistic update)
    setMessages((prev) => [...prev, optimisticMessage]);

    // Emit to socket
    socket.emit('dm:send', {
      recipientId: selectedUser._id,
      content: messageContent,
    });

    // Clear input
    setNewMessage('');
  };

  const handleTyping = () => {
    if (!selectedUser) return;
    socket.emit('dm:typing', { recipientId: selectedUser._id });
    clearTimeout(typingTimeoutRef.current);
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-gray-400">Select a conversation to start chatting</p>
          <p className="text-sm text-gray-500 mt-2">
            Go to 👥 Users and click on someone to message
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-light flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={selectedUser.avatar}
            alt={selectedUser.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h2 className="font-bold text-white">{selectedUser.username}</h2>
            <p className="text-xs text-gray-400">
              {selectedUser.isOnline ? '● Online' : '○ Offline'}
            </p>
          </div>
        </div>

        {/* Call button in header */}
        <CallButton
          recipientId={selectedUser._id}
          recipientName={selectedUser.username}
          callType="dm"
        />
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent 
                            rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400 mb-2">No messages yet</p>
              <p className="text-sm text-gray-500">Say hello! 👋</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isSender = msg.sender._id === user._id || msg.sender === user._id;
            const isTempMessage = msg._id.toString().startsWith('temp-');
            
            return (
              <div
                key={msg._id}
                className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl transition ${
                    isSender
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-light text-gray-100 rounded-bl-none'
                  } ${isTempMessage ? 'opacity-75' : 'opacity-100'}`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs opacity-60">
                      {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isTempMessage && (
                      <span className="text-xs opacity-40">⏳ sending...</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-1 justify-start">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-light">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onInput={handleTyping}
            placeholder="Type a message..."
            className="flex-1 bg-light border border-gray-600 rounded-xl px-4 py-3 
                       text-white placeholder-gray-500 focus:outline-none 
                       focus:border-primary transition"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-primary hover:bg-secondary text-white rounded-xl p-3 
                       transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <svg
              className="w-5 h-5 rotate-45"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default DMChat;