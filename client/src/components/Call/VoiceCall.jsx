// client/src/components/Call/VoiceCall.jsx
import { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const VoiceCall = () => {
  const [peer, setPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');

  const audioRef = useRef();

  const { activeCall, localStream, remoteStream, setRemoteStream, endCall, callDuration } =
    useCall();
  const { socket } = useSocket();
  const { user } = useAuth();

  // Format time display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Initialize WebRTC peer connection
  useEffect(() => {
    if (!localStream || !activeCall) return;

    (async () => {
      console.log('☎️ Initializing voice call');

      if (typeof window === 'undefined') {
        console.error('SimplePeer cannot be initialized on server-side');
        setConnectionState('error');
        return;
      }

      console.log('Local stream tracks:', localStream?.getTracks?.().map(t => t.kind));
      if (!localStream || !localStream.getTracks || localStream.getTracks().length === 0) {
        console.error('No local media tracks available');
        setConnectionState('error');
        toast.error('No local media tracks available');
        return;
      }

      if (typeof RTCPeerConnection === 'undefined') {
        console.error('RTCPeerConnection not available in this environment');
        setConnectionState('error');
        toast.error('WebRTC not supported in this browser');
        return;
      }

      // Prefer existing UMD on window (fast) -> try CDN UMD -> finally try local ESM package
      const loadSimplePeerFromCDN = () => new Promise((resolve, reject) => {
        if (window.SimplePeer) return resolve(window.SimplePeer);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/simple-peer/simplepeer.min.js';
        script.async = true;
        script.onload = () => {
          if (window.SimplePeer) return resolve(window.SimplePeer);
          reject(new Error('UMD SimplePeer not available after load'));
        };
        script.onerror = (e) => reject(new Error('Failed to load simple-peer UMD'));
        document.head.appendChild(script);
      });

      let SimplePeerConstructor = null;

      // 1) use window.SimplePeer if present
      if (window.SimplePeer) {
        SimplePeerConstructor = window.SimplePeer;
      } else {
        // 2) try loading UMD from CDN
        try {
          const UMD = await loadSimplePeerFromCDN();
          SimplePeerConstructor = UMD.default || UMD;
        } catch (errUMD) {
          console.warn('UMD load failed, falling back to dynamic import', errUMD);
          // 3) try dynamic ESM import (last resort)
          try {
            const SimplePeerLib = await import('simple-peer');
            SimplePeerConstructor = SimplePeerLib.default || SimplePeerLib;
          } catch (errImport) {
            console.error('Failed to load simple-peer via any method', errImport);
            setConnectionState('error');
            toast.error('Failed to load WebRTC library');
            return;
          }
        }
      }

      let peerInstance = null;
      try {
        peerInstance = new SimplePeerConstructor({
          initiator: user._id === activeCall.callInitiator,
          trickleIce: true,
          stream: localStream,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        });
      } catch (err) {
        console.error('Failed to create SimplePeer instance', err);
        setConnectionState('error');
        toast.error('Failed to start call (peer init error)');
        return;
      }

      // Send all signals (SDP and ICE) through unified forwarding
      peerInstance.on('signal', (signal) => {
        console.log('📡 Sending WebRTC signal');
        socket.emit('call:webrtc-signal', {
          callId: activeCall.id,
          signal,
        });
      });

      // Remote audio stream
      peerInstance.on('stream', (stream) => {
        console.log('☎️ Received remote audio');
        setRemoteStream(stream);
        if (audioRef.current) {
          audioRef.current.srcObject = stream;
        }
      });

      // Connection states
      peerInstance.on('connect', () => {
        console.log('✅ Voice call connected');
        setConnectionState('connected');
        toast.success('Call connected');
      });

      peerInstance.on('error', (err) => {
        console.error('❌ Voice call error:', err);
        setConnectionState('error');
        toast.error(`Connection error: ${err?.message || 'unknown'}`);
      });

      peerInstance.on('close', () => {
        console.log('☎️ Voice call closed');
        setConnectionState('closed');
      });

      setPeer(peerInstance);

      return () => {
        if (peerInstance && typeof peerInstance.destroy === 'function') {
          try { peerInstance.destroy(); } catch (e) { /* ignore */ }
        }
      };
    })();

  }, [localStream, activeCall, socket, user, setRemoteStream]);

  // Listen for WebRTC signals
  useEffect(() => {
    if (!socket || !peer) return;

    const handleSignal = ({ callId, signal }) => {
      if (callId === activeCall?.id) {
        console.log('📡 Received WebRTC signal');
        peer.signal(signal);
      }
    };

    socket.on('call:webrtc-signal', handleSignal);

    return () => {
      socket.off('call:webrtc-signal', handleSignal);
    };
  }, [socket, peer, activeCall?.id]);

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // End call
  const handleEndCall = () => {
    endCall(activeCall.id);
  };

  return (
    <div className="w-full h-screen bg-darker flex flex-col items-center justify-center">
      {/* Hidden audio element for remote audio */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Call UI */}
      <div className="text-center">
        {/* Avatar */}
        <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-light flex items-center 
                        justify-center overflow-hidden">
          <img
            src={activeCall?.remoteCaller?.avatar || ''}
            alt="Caller"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Caller Name */}
        <h1 className="text-3xl font-bold text-white mb-4">
          {activeCall?.remoteCaller?.username || 'Caller'}
        </h1>

        {/* Status */}
        <p className="text-lg text-gray-400 mb-8">
          {connectionState === 'connecting' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
              Connecting...
            </span>
          ) : connectionState === 'connected' ? (
            'Connected'
          ) : (
            'Connection error'
          )}
        </p>

        {/* Call Duration */}
        <div className="text-5xl font-bold text-primary mb-12">
          {formatTime(callDuration)}
        </div>

        {/* Controls */}
        <div className="flex gap-8 justify-center">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition
              ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-secondary'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <span className="text-3xl">{isMuted ? '🔇' : '🎤'}</span>
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center 
                       justify-center transition"
            title="End call"
          >
            <span className="text-3xl">📵</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCall;