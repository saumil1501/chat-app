// client/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    if (!user?.badges?.includes('admin')) {
      navigate('/chat');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ]);

      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm('Ban this user?')) return;

    try {
      await api.post(`/admin/ban-user/${userId}`);
      toast.success('User banned');
      fetchData();
    } catch (error) {
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await api.post(`/admin/unban-user/${userId}`);
      toast.success('User unbanned');
      fetchData();
    } catch (error) {
      toast.error('Failed to unban user');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-darker p-8">
      <h1 className="text-4xl font-bold text-white mb-8">👨‍💼 Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-dark border border-light rounded-lg p-6">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-3xl font-bold text-primary">{stats?.totalUsers}</p>
        </div>
        <div className="bg-dark border border-light rounded-lg p-6">
          <p className="text-gray-400 text-sm">Online Users</p>
          <p className="text-3xl font-bold text-green-500">{stats?.onlineUsers}</p>
        </div>
        <div className="bg-dark border border-light rounded-lg p-6">
          <p className="text-gray-400 text-sm">Total Rooms</p>
          <p className="text-3xl font-bold text-primary">{stats?.totalRooms}</p>
        </div>
        <div className="bg-dark border border-light rounded-lg p-6">
          <p className="text-gray-400 text-sm">Total Messages</p>
          <p className="text-3xl font-bold text-primary">{stats?.totalMessages}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-dark border border-light rounded-lg overflow-hidden">
        <div className="p-6 border-b border-light">
          <h2 className="text-xl font-bold text-white">Users Management</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-light">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Username</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Joined</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-light transition">
                  <td className="px-6 py-4 text-white">{u.username}</td>
                  <td className="px-6 py-4 text-gray-400">{u.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        u.isBanned
                          ? 'bg-red-900 text-red-200'
                          : u.isOnline
                          ? 'bg-green-900 text-green-200'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {u.isBanned ? 'Banned' : u.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    {u.isBanned ? (
                      <button
                        onClick={() => handleUnbanUser(u._id)}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBanUser(u._id)}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition"
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;