import { useEffect, useRef, useState, useCallback } from 'react';
import webrtcService from '../services/webrtcService';
import Whiteboard from './Whiteboard';
import InCallChat from './InCallChat';
import api from '../services/api';
import { Heart, ThumbsUp, ThumbsDown, PartyPopper, Lightbulb, Flame, Smile, Flag, CheckCircle2, Frown } from 'lucide-react';

const EMOJI_COMPONENTS = {
  '👏': <PartyPopper size={24} color="#f59e0b" />,
  '👍': <ThumbsUp size={24} color="#3b82f6" />,
  '❤️': <Heart size={24} color="#ef4444" />,
  '💡': <Lightbulb size={24} color="#eab308" />,
  '🔥': <Flame size={24} color="#ea580c" />,
  '😂': <Smile size={24} color="#10b981" />
};

const VideoCall = ({ socket, currentUser, targetUser, onClose, callType = 'video', incomingCall = null }) => {
  const [connectionState, setConnectionState] = useState('idle');
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callId, setCallId] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);
  // const [isInitiator, setIsInitiator] = useState(false);
  const [remoteStreamReady, setRemoteStreamReady] = useState(false);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [hasLocalAudio, setHasLocalAudio] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [noMediaAvailable, setNoMediaAvailable] = useState(false);

  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [emojis, setEmojis] = useState([]);
  const [isPipAvailable, setIsPipAvailable] = useState(false);
  const [networkQuality, setNetworkQuality] = useState('excellent');
  const [isRemoteObserverMode, setIsRemoteObserverMode] = useState(false);

  // In-call report
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Harassment or Abuse');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  // Post-call feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackValue, setFeedbackValue] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const hasEndedRef = useRef(false);
  const socketRef = useRef(socket);
  const hasStartedCall = useRef(false);
  const pendingOfferRef = useRef(null);
  const remoteCheckInterval = useRef(null);
  const callIdRef = useRef(null);

  // Keep socket reference updated
  useEffect(() => {
    socketRef.current = socket;
    webrtcService.socket = socket;
  }, [socket]);

  const cleanup = useCallback(() => {
    stopTimer();
    if (remoteCheckInterval.current) {
      clearInterval(remoteCheckInterval.current);
      remoteCheckInterval.current = null;
    }
    webrtcService.endCall();

    const currentSocket = socketRef.current;
    if (callIdRef.current && currentSocket && !hasEndedRef.current) {
      hasEndedRef.current = true;
      currentSocket.emit('end-call', { callId: callIdRef.current });
    }
  }, []);

  // Initialize media on mount
  useEffect(() => {
    const init = async () => {
      // Check Document PiP API support natively
      if (document.pictureInPictureEnabled) {
        setIsPipAvailable(true);
      }
      try {
        const stream = await webrtcService.initializeMedia({
          video: callType === 'video',
          audio: true
        });

        // Check what tracks we actually got
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        setHasLocalVideo(videoTracks.length > 0);
        setHasLocalAudio(audioTracks.length > 0);
        setIsAudioOnly(videoTracks.length === 0 && audioTracks.length > 0);
        setNoMediaAvailable(videoTracks.length === 0 && audioTracks.length === 0);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Setup webrtc service callbacks
        webrtcService.onRemoteStream = handleRemoteStream;
        webrtcService.onConnectionStateChange = handleConnectionStateChange;
        webrtcService.onError = handleError;
        webrtcService.onNetworkQualityChange = handleNetworkQualityChange;

      } catch (err) {
        console.warn('⚠️ Media hardware not found, continuing in Observer Mode:', err.message);
        setNoMediaAvailable(true);
        setHasLocalVideo(false);
        setHasLocalAudio(false);
        setIsAudioOnly(false);

        // Setup webrtc service callbacks anyway to receive remote data
        webrtcService.onRemoteStream = handleRemoteStream;
        webrtcService.onConnectionStateChange = handleConnectionStateChange;
        webrtcService.onError = handleError;
        webrtcService.onNetworkQualityChange = handleNetworkQualityChange;
      }
    };

    init().then(() => {
      // If we were mounted via a global incoming call, process it immediately
      if (incomingCall) {
        handleIncomingCall(incomingCall);
      }
    });

    return () => {
      cleanup();
      webrtcService.onRemoteStream = null;
      webrtcService.onConnectionStateChange = null;
      webrtcService.onError = null;
      webrtcService.onNetworkQualityChange = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array, init only runs ONCE over lifecycle

  // Keep local stream attached even if React re-renders the <video> element
  useEffect(() => {
    if (localVideoRef.current && webrtcService.localStream) {
      if (localVideoRef.current.srcObject !== webrtcService.localStream) {
        console.log('📺 Re-attaching local stream to video element after render');
        localVideoRef.current.srcObject = webrtcService.localStream;
      }
    }
  }); // Runs after every render to ensure the binding survives React DOM updates

  // Monitor remote stream and attach to video element
  useEffect(() => {
    if (remoteStreamReady && remoteVideoRef.current && webrtcService.remoteStream) {
      console.log('📺 Attaching remote stream to video element');

      // Ensure there are actually tracks to play before assigning
      if (webrtcService.remoteStream.getTracks().length > 0) {
        if (remoteVideoRef.current.srcObject !== webrtcService.remoteStream) {
          remoteVideoRef.current.srcObject = webrtcService.remoteStream;
        }
      } else {
        console.warn('⚠️ No tracks available on remoteStream, skipping attachment.');
      }
    }
  }, [remoteStreamReady, connectionState]);

  const handleIncomingCall = async (data) => {
    console.log('📞 Incoming call:', data);

    setPendingOffer(data.offer);
    pendingOfferRef.current = data.offer;
    setCallId(data.callId);
    callIdRef.current = data.callId;

    webrtcService.remoteUserId = data.from;
    webrtcService.callId = data.callId;

    if (data.renegotiation && webrtcService.pc) {
      console.log('🔄 Mid-call renegotiation received silently');
      try {
        await webrtcService.setRemoteDescription(data.offer);
        const answer = await webrtcService.createAnswer(data.offer);
        if (socketRef.current) {
          socketRef.current.emit('accept-call', {
            callId: data.callId,
            answer,
            to: webrtcService.remoteUserId,
            renegotiation: true
          });
        }
      } catch (err) {
        console.error('Failed renegotiation:', err);
      }
      return;
    }

    // Ensure media is initialized before showing incoming call UI
    if (!webrtcService.localStream) {
      try {
        const stream = await webrtcService.initializeMedia({
          video: callType === 'video',
          audio: true
        });

        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        setHasLocalVideo(videoTracks.length > 0);
        setHasLocalAudio(audioTracks.length > 0);
        setIsAudioOnly(videoTracks.length === 0 && audioTracks.length > 0);
        setNoMediaAvailable(videoTracks.length === 0 && audioTracks.length === 0);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('⚠️ Failed to initialize media for incoming call, continuing in Observer Mode:', err.message);
        setNoMediaAvailable(true);
        setHasLocalVideo(false);
        setHasLocalAudio(false);
        setIsAudioOnly(false);
      }
    }

    setConnectionState('receiving');
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;



    const handleCallRinging = (data) => {
      setCallId(data.callId);
      callIdRef.current = data.callId;
      webrtcService.callId = data.callId;
      setConnectionState('ringing');
    };

    const handleCallAccepted = async (data) => {
      try {
        console.log('✅ Call accepted, setting remote description');
        await webrtcService.setRemoteDescription(data.answer);
        startRemoteStreamCheck();
        setConnectionState('connected');
        startTimer();
      } catch (err) {
        console.error('❌ Error in call accepted:', err);
        setError('Connection failed: ' + err.message);
        setConnectionState('error');
      }
    };

    const handleCallRejected = (data) => {
      setError(`Call rejected: ${data.reason}`);
      setConnectionState('ended');
      hasEndedRef.current = true;
    };

    const handleCallConnected = () => {
      console.log('📞 Call connected event received');
      setConnectionState('connected');
      startTimer();
      startRemoteStreamCheck();
    };

    const handleCallEnded = (data) => {
      setConnectionState('ended');
      stopTimer();
      hasEndedRef.current = true;
    };

    const handleCallCancelled = (data) => {
      setError('Call cancelled by caller');
      setConnectionState('ended');
      hasEndedRef.current = true;
    };

    const handleIceCandidate = (data) => {
      console.log('❄️ Received ICE candidate from:', data.from);
      webrtcService.addIceCandidate(data.candidate);
    };

    const handleRemoteEmoji = (data) => {
      const newEmoji = {
        id: Date.now() + Math.random(),
        emoji: data.emoji,
        x: Math.random() * 60 + 20, // Random horizontal position (20%-80%)
        timestamp: Date.now()
      };

      setEmojis(prev => [...prev.filter(e => Date.now() - e.timestamp < 3000), newEmoji]);
    };

    const handleCallError = (data) => {
      setError(data.message);
      setConnectionState('error');
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-ringing', handleCallRinging);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-connected', handleCallConnected);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-cancelled', handleCallCancelled);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-error', handleCallError);
    socket.on('emoji-reaction', handleRemoteEmoji);

    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-ringing', handleCallRinging);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-connected', handleCallConnected);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-cancelled', handleCallCancelled);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-error', handleCallError);
      socket.off('emoji-reaction', handleRemoteEmoji);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, callType]);

  const startRemoteStreamCheck = () => {
    if (remoteCheckInterval.current) {
      clearInterval(remoteCheckInterval.current);
    }

    remoteCheckInterval.current = setInterval(() => {
      if (webrtcService.remoteStream &&
        webrtcService.remoteStream.getTracks().length > 0) {
        console.log('✅ Remote stream detected with tracks:',
          webrtcService.remoteStream.getTracks().map(t => t.kind));
        setRemoteStreamReady(true);
        clearInterval(remoteCheckInterval.current);
        remoteCheckInterval.current = null;
      }
    }, 500);

    setTimeout(() => {
      if (remoteCheckInterval.current) {
        clearInterval(remoteCheckInterval.current);
        remoteCheckInterval.current = null;
        console.log('⚠️ Remote stream check timeout, dropping into Observer Mode');
        setIsRemoteObserverMode(true);
      }
    }, 3000); // 3 seconds timeout
  };

  const handleRemoteStream = (stream) => {
    console.log('📺 handleRemoteStream called with tracks:',
      stream.getTracks().map(t => t.kind));
    setRemoteStreamReady(true);

    if (remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== stream) {
        remoteVideoRef.current.srcObject = stream;
      }
    }
  };

  const handleConnectionStateChange = (state) => {
    console.log('Connection state:', state);
    if (state === 'failed' || state === 'disconnected') {
      setError('Connection lost.');
      setConnectionState('error');
    } else if (state === 'connected') {
      setConnectionState('connected');
      setRemoteStreamReady(true); // Clear "Connecting" automatically when ICE succeeds
      startRemoteStreamCheck();
    }
  };

  const handleNetworkQualityChange = (quality) => {
    setNetworkQuality(quality);
  };

  const handleError = (errMsg) => {
    setError(errMsg);
    setConnectionState('error');
  };

  const startCall = async () => {
    if (hasStartedCall.current) return;
    hasStartedCall.current = true;

    try {
      setConnectionState('calling');

      if (!webrtcService.localStream) {
        try {
          const stream = await webrtcService.initializeMedia({
            video: callType === 'video',
            audio: true
          });

          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks();
          setHasLocalVideo(videoTracks.length > 0);
          setHasLocalAudio(audioTracks.length > 0);
          setIsAudioOnly(videoTracks.length === 0 && audioTracks.length > 0);
          setNoMediaAvailable(videoTracks.length === 0 && audioTracks.length === 0);

          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.warn('⚠️ Media missing in startCall, proceeding in Observer Mode:', err.message);
          setNoMediaAvailable(true);
          setHasLocalVideo(false);
          setHasLocalAudio(false);
          setIsAudioOnly(false);
        }
      }

      webrtcService.remoteUserId = targetUser._id;

      console.log('📤 Sending call offer...');
      const offer = await webrtcService.createOffer();

      socketRef.current.emit('call-user', {
        userToCall: targetUser._id,
        offer,
        callType: isAudioOnly ? 'audio' : callType
      });
    } catch (err) {
      console.error('❌ Error starting call:', err);
      setError(err.message);
      setConnectionState('error');
      hasStartedCall.current = false;
    }
  };

  const acceptCall = async () => {
    try {
      setConnectionState('connecting');

      const offer = pendingOfferRef.current || pendingOffer;
      if (!offer) {
        throw new Error('No pending offer found');
      }

      const answer = await webrtcService.createAnswer(offer);

      socketRef.current.emit('accept-call', {
        callId,
        answer,
        to: webrtcService.remoteUserId
      });

      startRemoteStreamCheck();

    } catch (err) {
      console.error('❌ Error accepting call:', err);
      setError(err.message);
      setConnectionState('error');
    }
  };

  const rejectCall = () => {
    if (socketRef.current && callId) {
      socketRef.current.emit('reject-call', { callId, reason: 'rejected' });
    }
    setConnectionState('ended');
    hasEndedRef.current = true;
  };

  const endCall = () => {
    cleanup();
    setConnectionState('ended');
    // Show post-call feedback after a brief delay
    if (callDuration > 10) {
      setTimeout(() => setShowFeedback(true), 800);
    }
  };

  const cancelCall = () => {
    if (socketRef.current && callId) {
      socketRef.current.emit('cancel-call', { callId });
    }
    setConnectionState('ended');
    hasEndedRef.current = true;
    hasStartedCall.current = false;
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    webrtcService.toggleAudio(newMutedState);
    setIsMuted(newMutedState);
  };

  const toggleVideo = () => {
    const newVideoOffState = !isVideoOff;
    webrtcService.toggleVideo(!newVideoOffState);
    setIsVideoOff(newVideoOffState);
  };

  useEffect(() => {
    return () => {
      console.log('🧹 VideoCall unmounting, cleaning up webrtc...');
      webrtcService.endCall();
    };
  }, []);

  const handleScreenShare = async () => {
    try {
      const { stream, isScreenSharing: sharing } = await webrtcService.toggleScreenShare();
      setIsScreenSharing(sharing);
      if (sharing && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Turn off camera video logically
        setIsVideoOff(true);
      } else if (!sharing && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        setIsVideoOff(false);
      }
    } catch (err) {
      console.error('Screen sharing failed', err);
    }
  };

  const toggleWhiteboard = () => {
    setIsWhiteboardActive(prev => !prev);
    if (isSidebarOpen) setIsSidebarOpen(false); // Can't have both open
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
    if (isWhiteboardActive) setIsWhiteboardActive(false);
  };

  const togglePiP = async () => {
    if (!remoteVideoRef.current || !isPipAvailable) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await remoteVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Failed to toggle PiP mode:', err);
    }
  };

  const sendEmoji = (emojiObj) => {
    if (socketRef.current && callIdRef.current) {
      socketRef.current.emit('emoji-reaction', { callId: callIdRef.current, emoji: emojiObj, to: webrtcService.remoteUserId });
      const newEmoji = {
        id: Date.now() + Math.random(),
        emoji: emojiObj,
        x: Math.random() * 60 + 20,
        timestamp: Date.now()
      };
      setEmojis(prev => [...prev.filter(e => Date.now() - e.timestamp < 3000), newEmoji]);
    }
  };

  const handleInCallReport = async () => {
    if (!callIdRef.current) return;
    setReportSubmitting(true);
    try {
      await api.post(`/calls/${callIdRef.current}/report`, { reason: reportReason, details: reportDetails, reportedUserId: targetUser?._id });
      setReportDone(true);
      setTimeout(() => { setShowReportModal(false); setReportDone(false); setReportDetails(''); }, 2500);
    } catch (err) {
      console.error('Report failed:', err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleFeedback = async (value) => {
    setFeedbackValue(value);
    setFeedbackGiven(true);
    if (callIdRef.current) {
      try { await api.post(`/calls/${callIdRef.current}/feedback`, { feedback: value }); } catch (_) { }
    }
    if (value === 'thumbsUp') {
      setTimeout(() => setShowFeedback(false), 1500);
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setCallDuration(p => p + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const renderStatus = () => {
    switch (connectionState) {
      case 'idle': return 'Ready';
      case 'calling': return isAudioOnly ? 'Calling (Audio)...' : 'Calling...';
      case 'ringing': return 'Ringing...';
      case 'receiving': return 'Incoming...';
      case 'connecting': return 'Connecting...';
      case 'connected': return isAudioOnly ? `Audio Call - ${formatDuration(callDuration)}` : formatDuration(callDuration);
      case 'ended': return 'Ended';
      case 'error': return 'Error';
      default: return '';
    }
  };

  const isCallActive = connectionState === 'connected';

  // Helper check: if we are fully connected but the remote check timed out (no stream arriving)
  const isObserverModeFallback = (state) => {
    return state === 'connected' && (!hasLocalVideo || noMediaAvailable || isRemoteObserverMode);
  };

  const renderNetworkQualityBars = () => {
    let activeBars = 4;
    let color = '#10b981'; // excellent - green

    if (networkQuality === 'good') { activeBars = 3; color = '#3b82f6'; /* blue */ }
    else if (networkQuality === 'fair') { activeBars = 2; color = '#f59e0b'; /* yellow */ }
    else if (networkQuality === 'poor') { activeBars = 1; color = '#ef4444'; /* red */ }
    else if (networkQuality === 'disconnected') { activeBars = 0; color = '#64748b'; /* slate */ }

    return (
      <div className="network-quality-bars" title={`Network Quality: ${networkQuality}`}>
        {[1, 2, 3, 4].map(bar => (
          <span
            key={bar}
            className="bar"
            style={{
              height: `${25 + (bar * 25)}%`, // 50%, 75%, 100%, 125% heights
              backgroundColor: bar <= activeBars ? color : 'rgba(255,255,255,0.2)'
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="video-call-overlay">
      <div className="video-call-container">
        {/* Header Overlay */}
        <div className="call-header-overlay">
          <div className="user-info">
            <h3>{targetUser?.name || (isAudioOnly ? 'Audio Call' : 'Video Call')}</h3>
            <div className="call-status">
              <span className={`status-dot ${connectionState}`}></span>
              {renderStatus()}
              {isCallActive && renderNetworkQualityBars()}
            </div>
          </div>
          <button className="icon-btn-close" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Video Area */}
        <div className="video-wrapper">
          {/* Remote Video (Connected) */}
          {isCallActive && (
            <div className="remote-video-container">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video"
                style={{ background: '#000' }}
              />
              {!remoteStreamReady && !isObserverModeFallback(connectionState) && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  background: 'rgba(0,0,0,0.8)',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div className="avatar-pulse" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                    {targetUser?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <p>Connecting...</p>
                </div>
              )}

              {/* Floating Emojis Canvas */}
              <div className="emoji-layer">
                {emojis.map(e => (
                  <div
                    key={e.id}
                    className="floating-emoji"
                    style={{ left: `${e.x}%` }}
                  >
                    {EMOJI_COMPONENTS[e.emoji] || e.emoji}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Whiteboard Stage */}
          {isWhiteboardActive && isCallActive && (
            <div className="whiteboard-stage">
              <Whiteboard webrtcService={webrtcService} />
            </div>
          )}

          {/* Local Video */}
          <div className={isCallActive ? (isWhiteboardActive || isSidebarOpen ? 'local-video-pip sidebar-active' : 'local-video-pip') : 'local-video-container'}>
            {hasLocalVideo ? (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={isCallActive ? '' : 'local-video-full'}
                />
                {isVideoOff && (
                  <div className="video-off-placeholder">
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                    <p>Camera Off</p>
                  </div>
                )}
              </>
            ) : (
              <div className="video-off-placeholder">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{hasLocalAudio ? 'Audio Only Mode' : 'No Camera Detected'}</p>
                  {noMediaAvailable && (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>You can still join as an Observer to watch and chat.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat Sidebar Area */}
          {isSidebarOpen && isCallActive && (
            <div className="incall-sidebar">
              <InCallChat
                socket={socketRef.current}
                callId={callIdRef.current}
                currentUser={currentUser}
                targetUser={targetUser}
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Calling Animation */}
        {(connectionState === 'calling' || connectionState === 'ringing' || connectionState === 'receiving') && (
          <div className="calling-animation">
            <div className="avatar-pulse">
              {targetUser?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <h2>{targetUser?.name || 'User'}</h2>
            <p>{connectionState === 'receiving' ? 'Incoming Call...' : (isAudioOnly ? 'Calling (Audio)...' : 'Calling...')}</p>
            {isAudioOnly && <small style={{ color: '#94a3b8' }}>No camera detected - Audio only mode</small>}
            {noMediaAvailable && <small style={{ color: '#ef4444' }}>No camera or microphone available!</small>}
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="error-toast" style={{ maxWidth: '90%', textAlign: 'center', lineHeight: '1.4' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Control Bar */}
        <div className="control-bar">
          {connectionState === 'idle' && (
            <div className="control-wrapper">
              <button className="control-btn success" onClick={startCall}>
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </button>
              <span className="control-label">{noMediaAvailable ? 'Join Observer' : 'Start Call'}</span>
            </div>
          )}

          {connectionState === 'receiving' && (
            <>
              <div className="control-wrapper">
                <button className="control-btn success" onClick={acceptCall}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </button>
                <span className="control-label">Accept</span>
              </div>
              <div className="control-wrapper">
                <button className="control-btn danger" onClick={rejectCall}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                    <line x1="23" y1="1" x2="1" y2="23"></line>
                  </svg>
                </button>
                <span className="control-label">Reject</span>
              </div>
            </>
          )}

          {(connectionState === 'calling' || connectionState === 'ringing') && (
            <div className="control-wrapper">
              <button className="control-btn danger" onClick={cancelCall}>
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                  <line x1="23" y1="1" x2="1" y2="23"></line>
                </svg>
              </button>
              <span className="control-label">Cancel</span>
            </div>
          )}

          {isCallActive && (
            <>
              <div className="control-wrapper">
                <button className={`control-btn ${isMuted ? 'danger' : ''}`} onClick={toggleMute}>
                  {isMuted ? (
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"></path>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  )}
                </button>
                <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {hasLocalVideo && (
                <div className="control-wrapper">
                  <button className={`control-btn ${isVideoOff ? 'danger' : ''}`} onClick={toggleVideo}>
                    {isVideoOff ? (
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                    )}
                  </button>
                  <span className="control-label">{isVideoOff ? 'Turn on' : 'Turn off'}</span>
                </div>
              )}

              <div className="control-wrapper">
                <button className={`control-btn ${isScreenSharing ? 'active' : ''}`} onClick={handleScreenShare} style={isScreenSharing ? { background: '#eff6ff', color: '#3b82f6', borderColor: '#bfdbfe' } : {}}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </button>
                <span className="control-label">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
              </div>

              <div className="control-wrapper">
                <button className={`control-btn ${isWhiteboardActive ? 'active' : ''}`} onClick={toggleWhiteboard} style={isWhiteboardActive ? { background: '#eff6ff', color: '#10b981', borderColor: '#a7f3d0' } : {}}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </button>
                <span className="control-label">Whiteboard</span>
              </div>

              <div className="control-wrapper">
                <button className={`control-btn ${isSidebarOpen ? 'active' : ''}`} onClick={toggleSidebar} style={isSidebarOpen ? { background: '#eff6ff', color: '#8b5cf6', borderColor: '#ddd6fe' } : {}}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
                <span className="control-label">Chat</span>
              </div>

              {isPipAvailable && (
                <div className="control-wrapper">
                  <button className="control-btn" onClick={togglePiP} title="Picture in Picture">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <rect x="12" y="11" width="7" height="8" rx="1" ry="1"></rect>
                    </svg>
                  </button>
                  <span className="control-label">Mini Video</span>
                </div>
              )}

              {/* Emoji Picker Dropdown */}
              <div className="control-wrapper emoji-dropdown-wrapper">
                <button className="control-btn toggle-emoji-btn" title="React">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                </button>
                <div className="emoji-menu">
                  {Object.keys(EMOJI_COMPONENTS).map(emoji => (
                    <button key={emoji} onClick={() => sendEmoji(emoji)} className="emoji-btn">
                      {EMOJI_COMPONENTS[emoji]}
                    </button>
                  ))}
                </div>
                <span className="control-label">React</span>
              </div>

              {/* 🚩 In-Call Report Button */}
              <div className="control-wrapper">
                <button
                  className="control-btn"
                  onClick={() => setShowReportModal(true)}
                  title="Report this user"
                  style={{ background: reportDone ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)', borderColor: reportDone ? '#10b981' : 'rgba(239,68,68,0.4)' }}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1, display: 'flex' }}>
                    {reportDone ? <CheckCircle2 size={20} /> : <Flag size={20} />}
                  </span>
                </button>
                <span className="control-label" style={{ color: reportDone ? '#10b981' : 'rgba(239,68,68,0.9)' }}>Report</span>
              </div>

              <div className="control-wrapper">
                <button className="control-btn danger" onClick={endCall}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                    <line x1="23" y1="1" x2="1" y2="23"></line>
                  </svg>
                </button>
                <span className="control-label">End Call</span>
              </div>
            </>
          )}

          {(connectionState === 'ended' || connectionState === 'error') && (
            <div className="control-wrapper">
              <button className="control-btn" onClick={onClose} style={{ color: 'white', background: 'rgba(255,255,255,0.2)' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <span className="control-label">Close</span>
            </div>
          )}
        </div>
      </div>

      {/* ── In-Call Report Modal ─────────────────────────────────────────── */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: 400, padding: '1.75rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
            {reportDone ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#111827' }}>Report Submitted</h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Our moderation team has been notified and will review this call.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>🚩 Report This Call</h3>
                  <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
                </div>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>Your report stays anonymous. Admins will be notified immediately.</p>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Reason</label>
                  <select value={reportReason} onChange={e => setReportReason(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.9rem', background: '#f9fafb', outline: 'none' }}>
                    {['Harassment or Abuse', 'Inappropriate Content', 'Spam or Scam', 'Fake Profile', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Additional details (optional)</label>
                  <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} rows={3} placeholder="Describe what happened..." style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.875rem', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setShowReportModal(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#f9fafb', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', color: '#4b5563' }}>Cancel</button>
                  <button onClick={handleInCallReport} disabled={reportSubmitting} style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none', background: reportSubmitting ? '#f87171' : '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                    {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Post-Call Feedback Modal ─────────────────────────────────────── */}
      {showFeedback && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 10001, background: 'white', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', maxWidth: 320, animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
          {!feedbackGiven ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.2rem', fontWeight: 800, color: '#111827', fontSize: '1rem' }}>How was the call?</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>Your feedback helps keep the community safe</p>
                </div>
                <button onClick={() => setShowFeedback(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => handleFeedback('thumbsUp')} style={{ flex: 1, padding: '0.875rem', borderRadius: '14px', border: '2px solid #bbf7d0', background: '#f0fdf4', color: '#10b981', display: 'flex', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  <ThumbsUp size={28} />
                </button>
                <button onClick={() => handleFeedback('thumbsDown')} style={{ flex: 1, padding: '0.875rem', borderRadius: '14px', border: '2px solid #fecdd3', background: '#fff1f2', color: '#ef4444', display: 'flex', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  <ThumbsDown size={28} />
                </button>
              </div>
            </>
          ) : feedbackValue === 'thumbsUp' ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <PartyPopper size={48} color="#f59e0b" />
              </div>
              <p style={{ margin: 0, fontWeight: 700, color: '#059669' }}>Glad it went well!</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Frown size={48} color="#6b7280" />
                </div>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 700, color: '#111827' }}>Sorry to hear that</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>Would you like to report this user?</p>
              </div>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setShowFeedback(false)} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', color: '#6b7280' }}>No thanks</button>
                <button onClick={() => { setShowFeedback(false); setShowReportModal(true); }} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Report User</button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .video-call-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.95);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease-out;
        }

        .video-call-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          max-width: 1200px;
          max-height: 800px;
          border-radius: 24px;
          background: #000;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 768px) {
          .video-call-container {
            border-radius: 0;
            max-height: 100vh;
          }
        }

        .video-wrapper {
          position: absolute;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .remote-video-container {
          width: 100%;
          height: 100%;
          position: relative;
          animation: scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .local-video-container {
          width: 100%;
          height: 100%;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .local-video-full {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .local-video-pip {
          position: absolute;
          bottom: 110px;
          right: 32px;
          width: 180px;
          height: 270px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
          border: 2px solid rgba(255,255,255,0.15);
          background: #1e293b;
          z-index: 10;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideInPip 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (max-width: 768px) {
          .local-video-pip {
            width: 110px;
            height: 165px;
            bottom: 100px;
            right: 20px;
            border-radius: 12px;
            border-width: 1px;
          }
        }

        .local-video-pip video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-off-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e293b;
          color: white;
          font-size: 1rem;
          flex-direction: column;
          gap: 12px;
        }

        .call-header-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 24px 32px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
          color: white;
          z-index: 20;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          pointer-events: none;
        }

        .user-info h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .call-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .network-quality-bars {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 14px;
          margin-left: 8px;
          padding-left: 8px;
          border-left: 1px solid rgba(255, 255, 255, 0.2);
        }

        .network-quality-bars .bar {
          width: 3px;
          border-radius: 1px;
          transition: background-color 0.3s, height 0.3s;
        }

        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
        .status-dot.connected { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .status-dot.calling, .status-dot.ringing { background: #eab308; }
        .status-dot.error { background: #ef4444; }

        .icon-btn-close {
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          pointer-events: auto;
        }
        
        .icon-btn-close:hover {
          background: rgba(255,255,255,0.3);
          transform: scale(1.05);
        }

        .control-bar {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 24px;
          padding: 16px 32px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          z-index: 20;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }

        @media (max-width: 768px) {
          .control-bar {
            bottom: 20px;
            padding: 12px 20px;
            gap: 16px;
            width: 90%;
            justify-content: center;
          }
        }

        .control-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .control-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #334155;
          background: white;
        }

        @media (max-width: 768px) {
          .control-btn {
            width: 48px;
            height: 48px;
          }
          .control-btn svg {
            width: 20px;
            height: 20px;
          }
        }

        .control-btn:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); }
        .control-btn:active { transform: translateY(0) scale(0.95); }

        .control-btn.success { background: #22c55e; color: white; }
        .control-btn.danger { background: #ef4444; color: white; }
        .control-btn.muted { background: rgba(255,255,255,0.2); color: white; }

        .control-label {
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          opacity: 0.9;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        .calling-animation {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 15;
          pointer-events: none;
          background: rgba(0,0,0,0.4);
        }

        .calling-animation h2 {
          color: white;
          font-size: 2rem;
          margin: 24px 0 8px 0;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .calling-animation p {
          color: #cbd5e1;
          font-size: 1.125rem;
          margin: 0;
        }

        .avatar-pulse {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 3rem;
          font-weight: 600;
          position: relative;
        }

        .avatar-pulse::before, .avatar-pulse::after {
          content: '';
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          border: 2px solid #8b5cf6;
          animation: pulseAnim 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .avatar-pulse::after {
          animation-delay: 1s;
          inset: -40px;
          opacity: 0.5;
        }

        @keyframes pulseAnim {
          0% { transform: scale(0.8); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideInPip { from { transform: translate(20px, 20px) scale(0.9); opacity: 0; } to { transform: translate(0, 0) scale(1); opacity: 1; } }

        .error-toast {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #ef4444;
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
          box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);
          z-index: 50;
          animation: slideDownToast 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          max-width: 90%;
          text-align: center;
          line-height: 1.4;
        }

        @keyframes slideDownToast {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        .incall-sidebar {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 320px;
          background: white;
          z-index: 30;
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          border-left: 1px solid rgba(0,0,0,0.1);
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .whiteboard-stage {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          z-index: 5;
          animation: fadeIn 0.3s ease-out;
        }

        .local-video-pip.sidebar-active {
          right: 340px; /* Offset to not cover sidebar */
        }

        @media (max-width: 768px) {
          .incall-sidebar {
            width: 100%;
            height: 50vh;
            top: auto;
            bottom: 0;
            border-top: 1px solid rgba(0,0,0,0.1);
            animation: slideUpBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            padding-bottom: 80px; /* Space for control bar */
          }

          @keyframes slideUpBottom {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        }

        .emoji-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 40;
          overflow: hidden;
        }

        .floating-emoji {
          position: absolute;
          bottom: 100px;
          font-size: 2.5rem;
          user-select: none;
          animation: floatUpEmoji 3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        @keyframes floatUpEmoji {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { transform: translateY(-20px) scale(1.2); opacity: 1; }
          20% { transform: translateY(-40px) scale(1); opacity: 1; }
          80% { transform: translateY(-150px) scale(1); opacity: 1; }
          100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
        }

        .emoji-dropdown-wrapper {
          position: relative;
        }

        .emoji-menu {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%) scale(0.9);
          background: white;
          border-radius: 16px;
          padding: 8px;
          display: flex;
          gap: 4px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: bottom center;
        }

        .emoji-dropdown-wrapper:hover .emoji-menu,
        .control-btn.toggle-emoji-btn:focus + .emoji-menu {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) scale(1);
        }

        .emoji-btn {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .emoji-btn:hover {
          background: #f1f5f9;
          transform: scale(1.15) translateY(-4px);
        }
      `}</style>
    </div>
  );
};

export default VideoCall;
