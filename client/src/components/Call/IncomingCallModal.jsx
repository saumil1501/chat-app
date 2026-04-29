// client/src/components/Call/IncomingCallModal.jsx
import { useCall } from '../../context/CallContext';

const IncomingCallModal = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  const formatMediaType = (type) => (type === 'video' ? '📹 Video Call' : '☎️ Voice Call');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark rounded-2xl p-8 text-center border border-light max-w-sm">
        {/* Caller Avatar */}
        <img
          src={incomingCall.callerAvatar}
          alt={incomingCall.callerName}
          className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
        />

        {/* Caller Name & Call Type */}
        <h2 className="text-2xl font-bold text-white mb-2">
          {incomingCall.callerName}
        </h2>
        <p className="text-gray-400 mb-6">
          {formatMediaType(incomingCall.mediaType)}
        </p>

        {/* Ringing Animation */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-primary rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {/* Decline Button */}
          <button
            onClick={() => rejectCall(incomingCall.callId)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 
                       hover:bg-red-700 text-white rounded-full transition"
          >
            <span className="text-xl">📵</span>
            Decline
          </button>

          {/* Accept Button */}
          <button
            onClick={() => acceptCall(incomingCall.callId)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 
                       hover:bg-green-700 text-white rounded-full transition"
          >
            <span className="text-xl">📞</span>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;