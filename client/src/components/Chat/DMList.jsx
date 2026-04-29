// client/src/components/Chat/DMList.jsx
import { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import { useDM } from '../../context/DMContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const DMList = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedUser, setSelectedUser } = useDM();
  const { isUserOnline, socket } = useSocket();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      console.log('📥 Fetching DM conversations...');
      const { data } = await api.get('/dm');
      console.log('✅ Conversations fetched:', data.conversations);
      setConversations(data.conversations);
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      toast.error('Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Listen for new DM messages to update conversation list
  useEffect(() => {
    if (!socket) return;

    const handleNewDM = (message) => {
      console.log('💌 New DM received, refreshing conversations');
      
      // Update conversation list
      setConversations((prev) => {
        const updated = [...prev];
        const convIndex = updated.findIndex(
          (c) => c.user._id === message.sender._id
        );

        if (convIndex >= 0) {
          // Update existing conversation
          updated[convIndex].lastMessage = message.content;
          updated[convIndex].lastMessageTime = message.createdAt;
          updated[convIndex].unreadCount += 1;
        } else {
          // Create new conversation
          updated.unshift({
            _id: message.sender._id,
            user: message.sender,
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            unreadCount: 1,
          });
        }

        // Move to top
        return updated.sort((a, b) => 
          new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        );
      });
    };

    socket.on('dm:receive', handleNewDM);

    return () => {
      socket.off('dm:receive', handleNewDM);
    };
  }, [socket]);

  // ✅ Clear unread count when user opens conversation
  useEffect(() => {
    if (!selectedUser) return;

    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === selectedUser._id
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  }, [selectedUser?._id]);

  if (loading) {
    return (
      <div className="p-4 text-gray-400 text-sm">
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-light rounded-xl" />
          <div className="h-12 bg-light rounded-xl" />
          <div className="h-12 bg-light rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      <h3 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">
        Direct Messages
      </h3>

      {conversations.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-gray-500 mb-2">No conversations yet</p>
          <p className="text-xs text-gray-600">
            Go to 👥 Users tab and click on a user to start chatting
          </p>
        </div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv._id}
            onClick={() => setSelectedUser(conv.user)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left 
                       transition relative ${
                         selectedUser?._id === conv.user._id
                           ? 'bg-primary text-white'
                           : 'hover:bg-light text-gray-300'
                       }`}
          >
            {/* Avatar with Online Indicator */}
            <div className="relative shrink-0">
              <img
                src={conv.user.avatar}
                alt={conv.user.username}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 
                           border-darker ${
                             isUserOnline(conv.user._id)
                               ? 'bg-green-500'
                               : 'bg-gray-500'
                           }`}
              />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {conv.user.username}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {conv.lastMessage || 'No messages yet'}
              </p>
            </div>

            {/* ✅ Unread Badge - Only shows when count > 0 */}
            {conv.unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-2.5 py-1 
                             rounded-full flex-shrink-0 font-semibold">
                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
};

export default DMList;