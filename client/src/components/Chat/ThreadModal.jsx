// client/src/components/Chat/ThreadModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ThreadModal = ({ messageId, isOpen, onClose, roomId }) => {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && messageId) {
      console.log('📂 Opening thread for message:', messageId);
      fetchReplies();
    }
  }, [isOpen, messageId]);

  const fetchReplies = async () => {
    try {
      console.log('📥 Fetching replies...');
      // ✅ FIXED: No leading slash
      const { data } = await api.get(`threads/${messageId}`);
      console.log('✅ Replies fetched:', data.replies);
      setReplies(data.replies);
      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to load replies:', error);
      toast.error('Failed to load replies');
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    try {
      console.log('📤 Sending reply to message:', messageId);
      // ✅ FIXED: No leading slash
      const { data } = await api.post(`threads/${messageId}/reply`, {
        content: replyText.trim(),
        roomId,
      });

      console.log('✅ Reply sent:', data.reply);
      setReplies([...replies, data.reply]);
      setReplyText('');
      toast.success('Reply sent!');
    } catch (error) {
      console.error('❌ Failed to send reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark rounded-2xl w-full max-w-md max-h-[500px] flex flex-col 
                      border border-light">
        {/* Header */}
        <div className="p-4 border-b border-light flex items-center justify-between">
          <h2 className="font-bold text-white">💬 Thread</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Replies List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent 
                              rounded-full animate-spin" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No replies yet. Be first!</p>
          ) : (
            replies.map((reply) => (
              <div key={reply._id} className="flex gap-2">
                <img
                  src={reply.sender.avatar}
                  alt={reply.sender.username}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">
                    {reply.sender.username}
                  </p>
                  <p className="text-sm text-gray-300 bg-light rounded-lg p-2">
                    {reply.content}
                  </p>
                  <span className="text-xs text-gray-500">
                    {new Date(reply.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Input */}
        <form onSubmit={handleReply} className="p-4 border-t border-light flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply..."
            disabled={sending}
            className="flex-1 bg-light border border-gray-600 rounded-xl px-3 py-2 
                       text-white text-sm focus:outline-none focus:border-primary
                       disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || sending}
            className="bg-primary hover:bg-secondary text-white rounded-xl px-3 py-2 
                       transition disabled:opacity-50 font-semibold"
          >
            {sending ? '...' : '→'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ThreadModal;