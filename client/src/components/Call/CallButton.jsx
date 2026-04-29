// client/src/components/Call/CallButton.jsx
import { useState } from 'react';
import { useCall } from '../../context/CallContext';
import CallTypeModal from './CallTypeModal';

const CallButton = ({ recipientId, recipientName, callType = 'dm', roomId }) => {
  const [showCallTypeModal, setShowCallTypeModal] = useState(false);
  const { activeCall } = useCall();

  // Disable if already in a call
  if (activeCall) {
    return (
      <button
        disabled
        className="text-gray-600 cursor-not-allowed"
        title="Already in a call"
      >
        📞
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowCallTypeModal(true)}
        className="text-primary hover:text-secondary transition text-lg"
        title="Start call"
      >
        📞
      </button>

      {showCallTypeModal && (
        <CallTypeModal
          recipientId={recipientId}
          recipientName={recipientName}
          callType={callType}
          roomId={roomId}
          onClose={() => setShowCallTypeModal(false)}
        />
      )}
    </>
  );
};

export default CallButton;