// client/src/pages/CallPage.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCall } from '../context/CallContext';
import VideoCall from '../components/Call/VideoCall';
import VoiceCall from '../components/Call/VoiceCall';

const CallPage = () => {
  const { activeCall } = useCall();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeCall) {
      navigate('/chat');
    }
  }, [activeCall, navigate]);

  if (!activeCall) {
    return null;
  }

  return (
    <div className="w-full h-screen bg-darker">
      {activeCall.mediaType === 'video' ? (
        <VideoCall />
      ) : (
        <VoiceCall />
      )}
    </div>
  );
};

export default CallPage;