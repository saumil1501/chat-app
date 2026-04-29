// client/src/components/Call/CallTypeModal.jsx
import { useCall } from '../../context/CallContext';
import { useNavigate } from 'react-router-dom';

const CallTypeModal = ({ recipientId, recipientName, callType, roomId, onClose }) => {
  const { initiateCall } = useCall();
  const navigate = useNavigate();

  const handleStartCall = async (mediaType) => {
    try {
      await initiateCall({
        recipientId,
        roomId,
        mediaType,
        callType,
      });
      onClose();
      // Navigate to call page
      navigate('/call');
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark rounded-2xl p-8 border border-light max-w-sm">
        <h2 className="text-2xl font-bold text-white mb-2">
          Call {recipientName}
        </h2>
        <p className="text-gray-400 mb-6">Choose call type:</p>

        <div className="space-y-3">
          {/* Video Call Option */}
          <button
            onClick={() => handleStartCall('video')}
            className="w-full flex items-center gap-4 p-4 bg-light hover:bg-primary/20 
                       rounded-xl transition border border-gray-600 hover:border-primary"
          >
            <span className="text-3xl">📹</span>
            <div className="text-left">
              <p className="font-semibold text-white">Video Call</p>
              <p className="text-xs text-gray-400">See each other</p>
            </div>
          </button>

          {/* Voice Call Option */}
          <button
            onClick={() => handleStartCall('voice')}
            className="w-full flex items-center gap-4 p-4 bg-light hover:bg-primary/20 
                       rounded-xl transition border border-gray-600 hover:border-primary"
          >
            <span className="text-3xl">☎️</span>
            <div className="text-left">
              <p className="font-semibold text-white">Voice Call</p>
              <p className="text-xs text-gray-400">Audio only</p>
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-gray-400 hover:text-white transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CallTypeModal;