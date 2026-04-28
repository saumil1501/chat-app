// client/src/components/Sidebar/Sidebar.jsx
import { useState, useEffect } from 'react';
import { useAuth, api } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import ProfileModal from '../User/ProfileModal';

const Sidebar = ({ activeRoom, onRoomSelect }) => {
  const [rooms, setRooms] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('rooms');
  const [users, setUsers] = useState([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  const { user, logout } = useAuth();
  const { isUserOnline, isConnected } = useSocket();

  useEffect(() => {
    fetchRooms();
    fetchUsers();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms');
      setRooms(data.rooms);
    } catch (error) {
      toast.error('Failed to load rooms');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setLoading(true);
    try {
      const { data } = await api.post('/rooms', {
        name: newRoomName,
        description: newRoomDesc,
      });
      setRooms([data.room, ...rooms]);
      setNewRoomName('');
      setNewRoomDesc('');
      setShowCreateRoom(false);
      toast.success(`Room "${data.room.name}" created! 🎉`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-darker border-r border-light">
        {/* User Profile Header */}
        <div className="p-4 border-b border-light">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={user?.avatar}
                alt={user?.username}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 
                            border-darker ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{user?.username}</p>
              <p className="text-xs text-gray-400">
                {isConnected ? '● Online' : '○ Connecting...'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 transition text-sm"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-light">
          {['rooms', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition
                ${activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab === 'rooms' ? '🏠 Rooms' : '👥 Users'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {activeTab === 'rooms' ? (
            <>
              {/* Create Room Button */}
              <button
                onClick={() => setShowCreateRoom(!showCreateRoom)}
                className="w-full mb-3 py-2 px-4 bg-primary hover:bg-secondary 
                           rounded-xl text-sm font-medium text-white transition flex 
                           items-center justify-center gap-2"
              >
                <span>+</span> Create Room
              </button>

              {/* Create Room Form */}
              {showCreateRoom && (
                <form
                  onSubmit={handleCreateRoom}
                  className="mb-3 p-3 bg-light rounded-xl space-y-2"
                >
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Room name"
                    className="w-full bg-darker border border-gray-600 rounded-lg 
                               px-3 py-2 text-sm text-white placeholder-gray-500 
                               focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full bg-darker border border-gray-600 rounded-lg 
                               px-3 py-2 text-sm text-white placeholder-gray-500 
                               focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-primary hover:bg-secondary rounded-lg py-2 
                                 text-xs text-white transition disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateRoom(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg py-2 
                                 text-xs text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Rooms List */}
              <div className="space-y-1">
                {rooms.map((room) => (
                  <button
                    key={room._id}
                    onClick={() => onRoomSelect(room)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl 
                               text-left transition group
                               ${activeRoom?._id === room._id
                                 ? 'bg-primary text-white'
                                 : 'hover:bg-light text-gray-300'
                               }`}
                  >
                    <div className="w-8 h-8 bg-light rounded-lg flex items-center 
                                    justify-center text-lg shrink-0">
                      🏠
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm"># {room.name}</p>
                      {room.description && (
                        <p className="text-xs text-gray-400 truncate">{room.description}</p>
                      )}
                    </div>
                  </button>
                ))}

                {rooms.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-8">
                    No rooms yet. Create one!
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Users List */
            <div className="space-y-1">
              {users.map((u) => (
                <button
                  key={u._id}
                  onClick={() => setSelectedUserProfile(u._id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl 
                             hover:bg-light transition text-left"
                >
                  <div className="relative shrink-0">
                    <img
                      src={u.avatar}
                      alt={u.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full 
                                  border-2 border-darker
                                  ${isUserOnline(u._id) ? 'bg-green-500' : 'bg-gray-500'}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.username}</p>
                    <p className="text-xs text-gray-400">
                      {isUserOnline(u._id) ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        userId={selectedUserProfile}
        isOpen={!!selectedUserProfile}
        onClose={() => setSelectedUserProfile(null)}
      />
    </>
  );
};

export default Sidebar;