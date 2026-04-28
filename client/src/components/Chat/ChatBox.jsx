// client/src/components/Chat/ChatBox.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import toast from 'react-hot-toast';
import SearchBar from './SearchBar';

const TypingIndicator = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? `${typingUsers[0]} is typing`
    : `${typingUsers.join(', ')} are typing`;

  return (
    <div className="px-4 py-2 flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400 italic">{text}...</span>
    </div>
  );
};

const ChatBox = ({ room }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const { socket } = useSocket();
  const { user } = useAuth();

  // Fetch messages when room changes
  useEffect(() => {
    if (!room) return;
    setMessages([]);
    setPage(1);
    fetchMessages(1);

    // Join the room via socket
    socket?.emit('room:join', { roomId: room._id });

    return () => {
      socket?.emit('room:leave', { roomId: room._id });
      setTypingUsers([]);
    };
  }, [room?._id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !room) return;

    // Receive new message
    const handleReceiveMessage = (message) => {
      if (message.room === room._id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    // Message edited
    const handleMessageEdited = ({ messageId, content, isEdited }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, content, isEdited } : msg
        )
      );
    };

    // Message deleted
    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    // Typing indicator
    const handleTypingUpdate = ({ username, isTyping, roomId }) => {
      if (roomId !== room._id) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(username) ? prev : [...prev, username];
        } else {
          return prev.filter((u) => u !== username);
        }
      });
    };

    // User joined/left notifications
    const handleUserJoined = ({ message, roomId }) => {
      if (roomId === room._id) {
        toast.success(message, { icon: '👋', duration: 3000 });
      }
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('room:userJoined', handleUserJoined);

    return () => {
      socket.off('message:receive', handleReceiveMessage);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('room:userJoined', handleUserJoined);
    };
  }, [socket, room?._id]);

  const fetchMessages = async (pageNum = 1) => {
    if (!room) return;
    setLoading(true);
    try {
      const { data } = await api.get(
        `/rooms/${room._id}/messages?page=${pageNum}&limit=50`
      );
      
      if (pageNum === 1) {
        setMessages(data.messages);
      } else {
        setMessages((prev) => [...data.messages, ...prev]);
      }

      setHasMore(pageNum < data.pagination.pages);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = useCallback((content) => {
    if (!socket || !room) return;

    if (editingMessage) {
      // Edit existing message
      socket.emit('message:edit', {
        messageId: editingMessage._id,
        content,
      });
      setEditingMessage(null);
    } else {
      // Send new message
      socket.emit('message:send', {
        roomId: room._id,
        content,
        messageType: 'text',
      });
    }
  }, [socket, room, editingMessage]);

  const handleDeleteMessage = useCallback((messageId) => {
    if (!socket || !room) return;
    if (window.confirm('Delete this message?')) {
      socket.emit('message:delete', { messageId, roomId: room._id });
    }
  }, [socket, room]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage);
  };

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark">
        <div className="text-center">
          <div className="text-8xl mb-6">💬</div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to ChatApp</h2>
          <p className="text-gray-400">Select a room from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark overflow-hidden">
      {/* Room Header */}
      <div className="p-4 border-b border-light flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center 
                          justify-center text-xl">
            🏠
          </div>
          <div>
            <h2 className="font-bold text-white">#{room?.name}</h2>
            {room?.description && (
              <p className="text-xs text-gray-400">{room.description}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="text-gray-400 hover:text-white transition text-xl"
          title="Search messages"
        >
          🔍
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <SearchBar
          searchType="messages"
          onSearchResults={(data) => setSearchResults(data.messages || [])}
        />
      )}

      {/* Load More */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          className="mx-auto mt-2 text-xs text-primary hover:text-secondary 
                     transition py-1 px-3 rounded-full border border-primary/30"
        >
          Load earlier messages
        </button>
      )}

      {/* Show search results if available */}
      {showSearch && searchResults.length > 0 ? (
        <MessageList
          messages={searchResults}
          onEditMessage={() => {}}
          onDeleteMessage={() => {}}
          loading={false}
        />
      ) : (
        <>
          {/* Messages */}
          <MessageList
            messages={messages}
            onEditMessage={setEditingMessage}
            onDeleteMessage={handleDeleteMessage}
            loading={loading}
          />

          {/* Typing Indicator */}
          <TypingIndicator typingUsers={typingUsers} />
        </>
      )}

      {/* Message Input */}
      <MessageInput
        roomId={room?._id}
        onSendMessage={handleSendMessage}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />
    </div>
  );
};

export default ChatBox;