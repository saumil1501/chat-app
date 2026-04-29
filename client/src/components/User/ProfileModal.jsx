// client/src/components/User/ProfileModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../../context/AuthContext';
import { useDM } from '../../context/DMContext';
import { useAuth } from '../../context/AuthContext';
import CallButton from '../Call/CallButton';
import toast from 'react-hot-toast';

const ProfileModal = ({ userId, isOpen, onClose, isOwnProfile = false, onTabChange }) => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  const { setSelectedUser } = useDM();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
    }
  }, [isOpen, userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const endpoint = isOwnProfile ? '/user/me' : `/user/profile/${userId}`;
      const { data } = await api.get(endpoint);
      setUser(data.user);
      setFormData(data.user);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data } = await api.put('/user/profile', formData);
      setUser(data.user);
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  // ✅ FIXED: Handle Start DM with tab switch
  const handleStartDM = () => {
    if (user) {
      // Set selected user
      setSelectedUser(user);
      
      // Switch to DM tab
      if (onTabChange) {
        onTabChange('dm');
      }
      
      // Close modal
      onClose();
      
      toast.success(`Started DM with ${user.username}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
      <div className="bg-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto 
                      border border-light shadow-2xl">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent 
                            rounded-full animate-spin" />
          </div>
        ) : user ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-light flex items-start justify-between sticky top-0 bg-dark">
              <div>
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-20 h-20 rounded-full mb-3 object-cover"
                />
                <h2 className="text-2xl font-bold text-white">{user.username}</h2>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Status */}
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">
                  Status
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                  <p className="text-white">
                    {user.statusMessage || 'Available'}
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">Bio</p>
                {isEditing && isOwnProfile ? (
                  <textarea
                    value={formData.bio || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    maxLength={500}
                    className="w-full bg-light border border-gray-600 rounded-lg 
                               px-3 py-2 text-white text-sm focus:outline-none 
                               focus:border-primary"
                    rows="3"
                  />
                ) : (
                  <p className="text-gray-300">
                    {user.bio || 'No bio added yet'}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">
                  📍 Location
                </p>
                {isEditing && isOwnProfile ? (
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full bg-light border border-gray-600 rounded-lg 
                               px-3 py-2 text-white text-sm focus:outline-none 
                               focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-300">{user.location || 'Not specified'}</p>
                )}
              </div>

              {/* Timezone */}
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">
                  🕐 Timezone
                </p>
                {isEditing && isOwnProfile ? (
                  <input
                    type="text"
                    value={formData.timezone || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, timezone: e.target.value })
                    }
                    className="w-full bg-light border border-gray-600 rounded-lg 
                               px-3 py-2 text-white text-sm focus:outline-none 
                               focus:border-primary"
                    placeholder="e.g., UTC, EST, IST"
                  />
                ) : (
                  <p className="text-gray-300">{user.timezone || 'UTC'}</p>
                )}
              </div>

              {/* Website */}
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">
                  🌐 Website
                </p>
                {isEditing && isOwnProfile ? (
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    className="w-full bg-light border border-gray-600 rounded-lg 
                               px-3 py-2 text-white text-sm focus:outline-none 
                               focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-300">{user.website || 'Not added'}</p>
                )}
              </div>

              {/* Badges */}
              {user.badges && user.badges.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-2">
                    Badges
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {user.badges.map((badge) => (
                      <span
                        key={badge}
                        className="bg-primary/20 text-primary text-xs px-3 py-1 
                                   rounded-full capitalize"
                      >
                        {badge === 'admin' && '👑'}
                        {badge === 'verified' && '✓'}
                        {badge === 'moderator' && '🛡️'} {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-light flex gap-2 sticky bottom-0 bg-dark">
              {isOwnProfile ? (
                !isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-primary hover:bg-secondary text-white 
                               font-semibold py-3 rounded-xl transition"
                  >
                    ✏️ Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      className="flex-1 bg-primary hover:bg-secondary text-white 
                                 font-semibold py-3 rounded-xl transition"
                    >
                      💾 Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white 
                                 font-semibold py-3 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </>
                )
              ) : (
                <>
                  <button
                    onClick={handleStartDM}
                    className="flex-1 bg-primary hover:bg-secondary text-white 
                               font-semibold py-3 rounded-xl transition flex items-center 
                               justify-center gap-2"
                  >
                    <span>💬</span> Message
                  </button>

                  <CallButton
                    recipientId={user._id}
                    recipientName={user.username}
                    callType="dm"
                  />
                </>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-400">
            User not found
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;