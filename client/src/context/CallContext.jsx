// client/src/context/CallContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { api } from './AuthContext';
import toast from 'react-hot-toast';

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);

  const { socket } = useSocket();
  const { user } = useAuth();

  // Fetch call history
  const fetchCallHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/calls/history');
      setCallHistory(data.callHistory);
    } catch (error) {
      console.error('Failed to fetch call history:', error);
    }
  }, []);

  // Get call history with specific user
  const fetchCallHistoryWithUser = useCallback(async (userId) => {
    try {
      const { data } = await api.get(`/calls/history/${userId}`);
      return data.callHistory;
    } catch (error) {
      console.error('Failed to fetch call history:', error);
      return [];
    }
  }, []);

  // Initiate call
  const initiateCall = useCallback(
    async ({ recipientId, roomId, mediaType, callType }) => {
      try {
        console.log(`📞 Initiating ${mediaType} call to ${recipientId}`);

        const callId = `${user._id}-${recipientId}-${Date.now()}`;

        // Create call history entry
        const { data } = await api.post('/calls', {
          recipientId,
          roomId,
          mediaType,
          callType,
        });

        // Helper to request media
        const tryGetStream = async (type) => {
          const constraints = {
            audio: true,
            video: type === 'video' ? { width: 1280, height: 720 } : false,
          };
          return await navigator.mediaDevices.getUserMedia(constraints);
        };

        let finalMediaType = mediaType;
        let stream = null;

        try {
          stream = await tryGetStream(mediaType);
        } catch (err) {
          console.error('Failed to get media devices for requested mediaType:', err);
          // If video requested, try audio-only fallback for common hardware errors
          if (mediaType === 'video' && ['NotReadableError', 'OverconstrainedError', 'NotFoundError', 'NotAllowedError'].includes(err.name)) {
            try {
              toast('Video unavailable, falling back to audio', { icon: '⚠️' });
              stream = await tryGetStream('audio');
              finalMediaType = 'audio';
            } catch (err2) {
              console.error('Audio fallback failed:', err2);
              toast.error('Cannot access camera/microphone');
              return;
            }
          } else {
            toast.error('Cannot access camera/microphone');
            return;
          }
        }

        setLocalStream(stream);

        // Emit call initiation via socket with resolved mediaType
        socket.emit('call:initiate', {
          recipientId,
          callType,
          mediaType: finalMediaType,
          callId,
        });

        // Set active call with callInitiator
        setActiveCall({
          id: callId,
          recipientId,
          roomId,
          mediaType: finalMediaType,
          callType,
          callInitiator: user._id,
          status: 'ringing',
          startTime: new Date(),
        });

        toast.loading(`Calling...`);
      } catch (error) {
        console.error('Failed to initiate call:', error);
        toast.error('Failed to initiate call');
      }
    },
    [user, socket]
  );

  // Accept call
  const acceptCall = useCallback(
    async (callId) => {
      try {
        console.log(`✅ Accepting call ${callId}`);

        // Get media stream with fallback
        const mediaType = incomingCall?.mediaType;
        const tryGetStream = async (type) => {
          const constraints = {
            audio: true,
            video: type === 'video' ? { width: 1280, height: 720 } : false,
          };
          return await navigator.mediaDevices.getUserMedia(constraints);
        };

        let finalMediaType = mediaType;
        let stream = null;

        try {
          stream = await tryGetStream(mediaType);
        } catch (err) {
          console.error('Failed to get media for accept:', err);
          if (mediaType === 'video' && ['NotReadableError', 'OverconstrainedError', 'NotFoundError', 'NotAllowedError'].includes(err.name)) {
            try {
              toast('Video unavailable, accepting as audio call', { icon: '⚠️' });
              stream = await tryGetStream('audio');
              finalMediaType = 'audio';
            } catch (err2) {
              console.error('Audio fallback failed on accept:', err2);
              toast.error('Cannot access camera/microphone');
              rejectCall(callId, 'media-error');
              return;
            }
          } else {
            toast.error('Cannot access camera/microphone');
            rejectCall(callId, 'media-error');
            return;
          }
        }

        setLocalStream(stream);

        // Emit acceptance via socket
        socket.emit('call:accept', { callId });

        // Update active call with callInitiator
        setActiveCall({
          id: callId,
          recipientId: incomingCall?.callerId,
          remoteCaller: {
            username: incomingCall?.callerName,
            avatar: incomingCall?.callerAvatar,
          },
          mediaType: finalMediaType,
          callType: incomingCall?.callType,
          callInitiator: incomingCall?.callerId,
          status: 'connected',
          startTime: new Date(),
        });

        setIncomingCall(null);
        setIsCallActive(true);
        toast.success('Call connected');
      } catch (error) {
        console.error('Failed to accept call:', error);
        toast.error('Failed to accept call');
        rejectCall(callId, 'media-error');
      }
    },
    [incomingCall, socket]
  );

  // Reject call
  const rejectCall = useCallback(
    (callId, reason = 'rejected') => {
      try {
        console.log(`❌ Rejecting call ${callId}`);
        socket.emit('call:reject', { callId, reason });
        setIncomingCall(null);
      } catch (error) {
        console.error('Failed to reject call:', error);
      }
    },
    [socket]
  );

  // End call
  const endCall = useCallback(
    async (callId) => {
      try {
        console.log(`📞 Ending call ${callId}`);

        // Stop media streams
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
          setLocalStream(null);
        }

        // Emit call end via socket
        socket.emit('call:end', { callId, duration: callDuration });

        // Update call history
        try {
          await api.put(`/calls/${activeCall?.id}`, {
            status: 'ended',
            duration: callDuration,
            endTime: new Date(),
          });
        } catch (error) {
          console.error('Failed to update call history:', error);
        }

        // Reset state
        setActiveCall(null);
        setRemoteStream(null);
        setIsCallActive(false);
        setCallDuration(0);

        toast.success('Call ended');
      } catch (error) {
        console.error('Failed to end call:', error);
      }
    },
    [activeCall, callDuration, localStream, socket]
  );

  // Cancel call (before accept)
  const cancelCall = useCallback(
    (callId) => {
      try {
        console.log(`❌ Cancelling call ${callId}`);
        socket.emit('call:cancel', { callId });
        setActiveCall(null);
        setLocalStream(null);
        toast.success('Call cancelled');
      } catch (error) {
        console.error('Failed to cancel call:', error);
      }
    },
    [socket]
  );

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    socket.on('call:incoming', (data) => {
      console.log('📞 Incoming call:', data);
      setIncomingCall(data);
      toast.loading(`${data.callerName} is calling...`);
    });

    // Call accepted
    socket.on('call:accepted', ({ callId }) => {
      console.log('✅ Call accepted');
      setActiveCall((prev) => (prev?.id === callId ? { ...prev, status: 'connected' } : prev));
      setIsCallActive(true);
      toast.dismiss();
      toast.success('Call connected');
    });

    // Call rejected
    socket.on('call:rejected', ({ callId, reason }) => {
      console.log(`❌ Call rejected: ${reason}`);
      setActiveCall(null);
      setLocalStream(null);
      toast.dismiss();
      toast.error('Call rejected');
    });

    // Call cancelled
    socket.on('call:cancelled', ({ callId }) => {
      console.log(`❌ Call cancelled`);
      setIncomingCall(null);
      toast.dismiss();
      toast.success('Call cancelled');
    });

    // Call ended
    socket.on('call:ended', ({ callId, reason }) => {
      console.log(`📞 Call ended: ${reason || ''}`);
      setActiveCall(null);
      setRemoteStream(null);
      setIsCallActive(false);
      setCallDuration(0);
      toast.dismiss();
      if (reason) toast.success(`Call ended: ${reason}`);
    });

    // WebRTC signals (unified)
    const handleSignal = ({ callId, signal }) => {
      console.log('📡 CallContext received WebRTC signal for call', callId);
      // CallContext only logs signals; actual peer signaling is handled in call components
    };

    socket.on('call:webrtc-signal', handleSignal);

    return () => {
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:cancelled');
      socket.off('call:ended');
      socket.off('call:webrtc-signal', handleSignal);
    };
  }, [socket]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        callHistory,
        localStream,
        remoteStream,
        callDuration,
        isCallActive,
        setRemoteStream,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        cancelCall,
        fetchCallHistory,
        fetchCallHistoryWithUser,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};