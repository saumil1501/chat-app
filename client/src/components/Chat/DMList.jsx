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
  const { isUserOnline } = useSocket();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/dm');
      setConversations(data.conversations);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-2 p-2">
      <h3 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">
        Direct Messages
      </h3>

      {conversations.length === 0 ? (
        <p className="px-4 text-xs text-gray-500">No conversations yet</p>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv._id}
            onClick={() => setSelectedUser(conv.user)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left 
                       transition ${
                         selectedUser?._id === conv.user._id
                           ? 'bg-primary text-white'
                           : 'hover:bg-light text-gray-300'
                       }`}
          >
            <div className="relative shrink-0">
              <img
                src={conv.user.avatar}
                alt={conv.user.username}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full 
                           border-2 border-darker
                           ${
                             isUserOnline(conv.user._id)
                               ? 'bg-green-500'
                               : 'bg-gray-500'
                           }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {conv.user.username}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {conv.lastMessage}
              </p>
            </div>

            {conv.unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                {conv.unreadCount}
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
};

export default DMList;