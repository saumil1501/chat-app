// client/src/components/Call/VideoCall.jsx
import { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const VideoCall = () => {
  const [peer, setPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

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
      console.log('🎥 Initializing WebRTC peer connection');

      if (typeof window === 'undefined') {
        console.error('SimplePeer cannot be initialized on server-side');
        setConnectionState('error');
        return;
      }

      // Diagnostics
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

      // Remote stream
      peerInstance.on('stream', (stream) => {
        console.log('🎥 Received remote stream');
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      // Connection states
      peerInstance.on('connect', () => {
        console.log('✅ Peer connected');
        setConnectionState('connected');
        toast.success('Call connected');
      });

      peerInstance.on('error', (err) => {
        console.error('❌ Peer error:', err);
        setConnectionState('error');
        toast.error(`Connection error: ${err?.message || 'unknown'}`);
      });

      peerInstance.on('close', () => {
        console.log('📞 Peer connection closed');
        setConnectionState('closed');
      });

      setPeer(peerInstance);

      // cleanup
      return () => {
        if (peerInstance && typeof peerInstance.destroy === 'function') {
          try { peerInstance.destroy(); } catch (e) { /* ignore */ }
        }
      };
    })();

  }, [localStream, activeCall, socket, user, setRemoteStream]);

  // Listen for WebRTC signals from remote peer
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

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Toggle audio
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  // End call
  const handleEndCall = () => {
    endCall(activeCall.id);
  };

  return (
    <div className="w-full h-screen bg-darker flex flex-col">
      {/* Video Container */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-6 right-6 w-48 h-36 bg-darker rounded-xl overflow-hidden 
                        border-2 border-primary shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Connection Status Overlay */}
        {connectionState !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent 
                              rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">
                {connectionState === 'connecting' ? 'Connecting...' : 'Connection error'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-dark border-t border-light p-6 flex items-center justify-center gap-6">
        {/* Call Duration */}
        <div className="text-2xl font-bold text-white">
          {formatTime(callDuration)}
        </div>

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition
            ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-secondary'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="text-2xl">{isMuted ? '🔇' : '🎤'}</span>
        </button>

        {/* Video Toggle Button */}
        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition
            ${!isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-secondary'}`}
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          <span className="text-2xl">{isVideoOn ? '📹' : '📷'}</span>
        </button>

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center 
                     justify-center transition"
          title="End call"
        >
          <span className="text-2xl">📵</span>
        </button>
      </div>
    </div>
  );
};

export default VideoCall;