// client/src/components/Chat/DMChat.jsx
import { useState, useEffect, useRef } from 'react';
import { api } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useDM } from '../../context/DMContext';
import toast from 'react-hot-toast';

const DMChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const { selectedUser } = useDM();
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !selectedUser) return;

    socket.on('dm:receive', (message) => {
      if (message.sender._id === selectedUser._id) {
        setMessages((prev) => [...prev, message]);
        // Mark as read
        socket.emit('dm:read', { messageId: message._id });
      }
    });

    socket.on('dm:userTyping', ({ username }) => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1500);
    });

    return () => {
      socket.off('dm:receive');
      socket.off('dm:userTyping');
    };
  }, [socket, selectedUser]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/dm/${selectedUser._id}`);
      setMessages(data.messages);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('dm:send', {
      recipientId: selectedUser._id,
      content: newMessage.trim(),
    });

    setNewMessage('');
  };

  const handleTyping = () => {
    socket.emit('dm:typing', { recipientId: selectedUser._id });
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-gray-400">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-light flex items-center gap-3">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent 
                            rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${
                msg.sender._id === user._id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl ${
                  msg.sender._id === user._id
                    ? 'bg-primary text-white rounded-br-none'
                    : 'bg-light text-gray-100 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs opacity-60">
                  {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex gap-1">
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

      {/* Input */}
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
                       focus:border-primary"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-primary hover:bg-secondary text-white rounded-xl p-3 
                       transition disabled:opacity-50"
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