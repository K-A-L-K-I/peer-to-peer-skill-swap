// WebRTC Service - Fixed for Bidirectional Video with Audio-Only Fallback
class WebRTCService {
  constructor() {
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.socket = null;
    this.onRemoteStream = null;
    this.onConnectionStateChange = null;
    this.onError = null;
    this.iceCandidatesQueue = [];
    this.remoteUserId = null;
    this.isInitiator = false;
    this.callId = null;
    this.isMakingOffer = false;
    this.isIgnoringOffer = false;
    this.polite = false;
    this.isManualNegotiation = false;
    this.hasVideo = false;
    this.hasAudio = false;
  }

  getConfiguration() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        {
          urls: 'turn:stun.evan-brass.net:3478',
          username: 'guest',
          credential: 'password'
        },
        {
          urls: 'turn:stun.evan-brass.net:80?transport=tcp',
          username: 'guest',
          credential: 'password'
        },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    };
  }

  async initializeMedia(constraints = { video: true, audio: true }) {
    // If we're already fetching media, return that promise to prevent device lock races
    if (this._mediaInitPromise) {
      console.log('⏳ Media access already in progress, awaiting existing promise...');
      return this._mediaInitPromise;
    }

    // If we already have a healthy active stream, don't ask the user again
    if (this.localStream && this.localStream.active) {
      console.log('♻️ Reusing existing active local stream');
      return this.localStream;
    }

    this._mediaInitPromise = (async () => {
      try {
        console.log('🎥 Requesting media access...', constraints);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Browser does not support media devices. Please use a modern browser with HTTPS.');
        }

        // Stop any existing tracks
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
        }

        // Try video + audio first with simple basic constraints to maximize device compatibility
        let stream = null;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: constraints.video ? true : false,
            audio: constraints.audio ? true : false
          });
          this.hasVideo = constraints.video && stream.getVideoTracks().length > 0;
          this.hasAudio = constraints.audio && stream.getAudioTracks().length > 0;
        } catch (err) {
          console.warn('⚠️ Video+Audio failed:', err.name);

          // If video was requested, try audio-only
          if (constraints.video && constraints.audio) {
            console.log('🎤 Trying audio-only...');
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
              });
              this.hasVideo = false;
              this.hasAudio = true;
              console.log('✅ Audio-only mode enabled');
            } catch (audioErr) {
              console.warn('⚠️ Audio-only also failed:', audioErr.name);

              // Last resort: try video-only (some devices have camera but no mic)
              if (constraints.video) {
                console.log('📹 Trying video-only...');
                try {
                  stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                  });
                  this.hasVideo = true;
                  this.hasAudio = false;
                  console.log('✅ Video-only mode enabled');
                } catch (videoOnlyErr) {
                  throw videoOnlyErr; // Nothing works
                }
              } else {
                throw audioErr;
              }
            }
          } else {
            throw err;
          }
        }

        // If we still don't have a stream, throw error
        if (!stream) {
          throw new Error('Could not access any media devices');
        }

        this.localStream = stream;

        const tracks = this.localStream.getTracks();
        console.log('✅ Media access granted. Tracks:', tracks.map(t => `${t.kind}:${t.id}`));
        console.log(`📹 Video: ${this.hasVideo}, 🎤 Audio: ${this.hasAudio}`);

        // If we have no video and no audio, that's a problem
        if (!this.hasVideo && !this.hasAudio) {
          throw new Error('No camera or microphone available on this device');
        }

        return this.localStream;
      } catch (err) {
        console.error('❌ Media access error:', err);

        // Provide specific error messages
        let errorMessage = 'Camera/Microphone access failed';

        // Always fallback to Mock Stream if hardware is missing, 
        // even if it failed during the audio-only fallback attempt.
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.message.includes('media devices')) {
          console.warn('⚠️ No physical hardware detected. Generating a mock media stream for testing...');
          const mockStream = this.createMockStream();
          this.localStream = mockStream;
          this.hasVideo = true;
          this.hasAudio = true;
          return this.localStream;
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Camera/Microphone permission denied. Please allow access in your browser settings and refresh the page.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Camera or microphone is already in use by another application. Please close other apps and try again.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not support the requested settings. Please try a different camera.';
        } else if (err.message.includes('No camera or microphone available')) {
          errorMessage = err.message;
        } else if (err.message.includes('Browser does not support')) {
          errorMessage = err.message;
        }

        throw new Error(errorMessage);
      }
    })();

    return this._mediaInitPromise;
  }

  createMockStream() {
    // Create a 640x480 canvas
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Simple bouncing rectangle animation
    let w = 80;
    let h = 80;
    let x = canvas.width / 2 - w / 2;
    let y = canvas.height / 2 - h / 2;
    let dx = 4;
    let dy = 4;

    const draw = () => {
      // Background
      ctx.fillStyle = '#1e293b'; // Slate background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Text
      ctx.fillStyle = '#60a5fa'; // Blue text
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Mock Camera', canvas.width / 2, 60);

      ctx.fillStyle = '#94a3b8'; // Small gray text
      ctx.font = '20px Arial';
      ctx.fillText('(Hardware not found)', canvas.width / 2, 95);

      // Bouncing box
      ctx.fillStyle = '#22c55e'; // Green box
      ctx.fillRect(x, y, w, h);

      // Update position
      if (x + w >= canvas.width || x <= 0) dx = -dx;
      if (y + h >= canvas.height || y <= 0) dy = -dy;

      x += dx;
      y += dy;

      requestAnimationFrame(draw);
    };
    draw();

    // 30 FPS Canvas stream
    const videoStream = canvas.captureStream(30);

    // Create a silent audio track
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioCtx.createMediaStreamDestination();

    // Combine video from canvas and audio from silent oscillator
    return new MediaStream([
      ...videoStream.getVideoTracks(),
      ...destination.stream.getAudioTracks()
    ]);
  }

  createPeerConnection(isInitiator = false) {
    console.log(`🔧 Creating RTCPeerConnection (initiator: ${isInitiator})`);

    this.isInitiator = isInitiator;
    this.polite = !isInitiator;

    // Close existing connection
    if (this.pc) {
      console.log('🧹 Closing existing peer connection');
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onsignalingstatechange = null;
      this.pc.onnegotiationneeded = null;
      this.pc.close();
      this.pc = null;
    }

    this.pc = new RTCPeerConnection(this.getConfiguration());
    this.iceCandidatesQueue = [];
    this.isMakingOffer = false;

    // Initialize Data Channel for Whiteboard/Chat integration
    if (this.isInitiator) {
      this.dataChannel = this.pc.createDataChannel('skill-swap-data');
      this.setupDataChannel(this.dataChannel);
    }

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          const sender = this.pc.addTrack(track, this.localStream);
          console.log(`➕ Added ${track.kind} track (${track.id}) to peer connection`);

          // Apply bitrate limits to video
          if (track.kind === 'video') {
            const parameters = sender.getParameters();
            if (!parameters.encodings) {
              parameters.encodings = [{}];
            }
            parameters.encodings[0].maxBitrate = 500 * 1000;
            parameters.encodings[0].maxFramerate = 24;
            sender.setParameters(parameters).catch(e => console.warn('Bitrate limit unsupported:', e));
          }
        } catch (err) {
          console.error(`❌ Failed to add ${track.kind} track:`, err);
        }
      });
    } else {
      console.warn('⚠️ No local stream when creating peer connection');
    }

    // Handle remote stream
    this.pc.ontrack = (event) => {
      console.log('📺 Remote track event:', {
        trackKind: event.track.kind,
        trackId: event.track.id,
        streamCount: event.streams.length
      });

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        console.log('📺 Created new remote stream');
      }

      const [stream] = event.streams;
      if (stream) {
        stream.getTracks().forEach(track => {
          const existingTrack = this.remoteStream.getTracks().find(t => t.id === track.id);
          if (!existingTrack) {
            this.remoteStream.addTrack(track);
            console.log(`➕ Added ${track.kind} track (${track.id}) to remote stream`);

            track.onended = () => {
              console.log(`🏁 Remote ${track.kind} track ended`);
              if (this.remoteStream) {
                this.remoteStream.removeTrack(track);
              }
            };
          }
        });
      }

      if (this.onRemoteStream && this.remoteStream.getTracks().length > 0) {
        console.log('📢 Notifying remote stream ready with tracks:',
          this.remoteStream.getTracks().map(t => t.kind));
        this.onRemoteStream(this.remoteStream);
      }
    };

    // ICE candidate handling
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('❄️ Generated ICE candidate:', event.candidate.type);
        if (this.socket && this.remoteUserId) {
          this.sendIceCandidate(event.candidate);
        } else {
          console.log('⏳ Socket or remoteUserId not ready, queuing ICE candidate to SEND layer');
          if (!this.pendingIceCandidatesToSend) {
            this.pendingIceCandidatesToSend = [];
          }
          this.pendingIceCandidatesToSend.push(event.candidate);
        }
      } else {
        console.log('✅ ICE gathering complete');
      }
    };

    // Connection state monitoring
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      console.log('🔌 Connection state changed:', state);

      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }

      if (state === 'connected') {
        this.startNetworkQualityMonitoring();
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (this.statsInterval) {
          clearInterval(this.statsInterval);
          this.statsInterval = null;
          if (this.onNetworkQualityChange) this.onNetworkQualityChange('disconnected');
        }
      }

      if (state === 'failed') {
        this.handleConnectionFailed();
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('❄️ ICE connection state:', this.pc.iceConnectionState);
      if (this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed') {
        console.log('✅ ICE connected - media should be flowing');
      }
    };

    this.pc.onsignalingstatechange = () => {
      console.log('📡 Signaling state:', this.pc.signalingState);
    };

    // Handle negotiation needed
    this.pc.onnegotiationneeded = async () => {
      if (this.isManualNegotiation) {
        console.log('🔄 Negotiation needed - ignoring during manual negotiation');
        return;
      }
      console.log('🔄 Negotiation needed');
      try {
        this.isMakingOffer = true;
        await this.pc.setLocalDescription();
        console.log('📤 Sending offer from negotiationneeded');
        if (this.socket && this.remoteUserId) {
          this.socket.emit('call-user', {
            userToCall: this.remoteUserId,
            offer: this.pc.localDescription,
            callType: this.hasVideo ? 'video' : 'audio',
            callId: this.callId,
            renegotiation: true
          });
        }
      } catch (err) {
        console.error('❌ Error during negotiation:', err);
      } finally {
        this.isMakingOffer = false;
      }
    };

    return this.pc;
  }

  sendIceCandidate(candidate) {
    if (this.socket && this.remoteUserId) {
      this.socket.emit('ice-candidate', {
        to: this.remoteUserId,
        candidate: candidate,
        callId: this.callId
      });
    }
  }

  flushPendingIceCandidates() {
    if (this.pendingIceCandidatesToSend && this.pendingIceCandidatesToSend.length > 0) {
      if (this.socket && this.remoteUserId) {
        console.log(`📤 Flushing ${this.pendingIceCandidatesToSend.length} pending ICE candidates...`);
        this.pendingIceCandidatesToSend.forEach(candidate => {
          this.sendIceCandidate(candidate);
        });
        this.pendingIceCandidatesToSend = [];
      }
    }
  }

  async createOffer() {
    try {
      this.isManualNegotiation = true;
      this.createPeerConnection(true);

      console.log('📤 Creating offer...');
      this.isMakingOffer = true;

      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.pc.setLocalDescription(offer);
      console.log('✅ Offer created and set as local description');

      await this.waitForIceGathering();

      this.flushPendingIceCandidates();

      this.isMakingOffer = false;
      this.isManualNegotiation = false;
      return this.pc.localDescription;
    } catch (err) {
      this.isMakingOffer = false;
      this.isManualNegotiation = false;
      console.error('❌ Error creating offer:', err);
      throw err;
    }
  }

  async createAnswer(offer) {
    try {
      this.isManualNegotiation = true;
      if (!this.pc) {
        this.createPeerConnection(false);
      }

      console.log('📥 Setting remote description (offer)...');
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ Remote description (offer) set');

      await this.processIceCandidatesQueue();

      console.log('📤 Creating answer...');
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      console.log('✅ Answer created and set as local description');

      await this.waitForIceGathering();

      this.flushPendingIceCandidates();

      this.isManualNegotiation = false;
      return this.pc.localDescription;
    } catch (err) {
      this.isManualNegotiation = false;
      console.error('❌ Error creating answer:', err);
      throw err;
    }
  }

  async setRemoteDescription(description) {
    try {
      console.log('📥 Setting remote description...', description.type);

      const readyForOffer = !this.isMakingOffer &&
        (this.pc.signalingState === 'stable' || this.isSettingRemoteAnswerPending);
      const offerCollision = description.type === 'offer' && !readyForOffer;
      this.isIgnoringOffer = !this.polite && offerCollision;

      if (this.isIgnoringOffer) {
        console.log('⚠️ Ignoring offer due to collision');
        return;
      }

      this.isSettingRemoteAnswerPending = description.type === 'answer';
      await this.pc.setRemoteDescription(new RTCSessionDescription(description));
      this.isSettingRemoteAnswerPending = false;

      console.log('✅ Remote description set');
      await this.processIceCandidatesQueue();
    } catch (err) {
      console.error('❌ Error setting remote description:', err);
      throw err;
    }
  }

  waitForIceGathering() {
    // In modern WebRTC, we use "Trickle ICE", meaning we don't wait for all candidates 
    // to be gathered before sending the offer/answer. We send the offer immediately, 
    // and as the browser finds new ICE candidates (like the TURN server), it emits 
    // them via 'onicecandidate' and we send them through the socket individually.
    // Waiting here with a timeout is an anti-pattern that breaks slow TURN servers.
    return Promise.resolve();
  }

  async addIceCandidate(candidate) {
    try {
      if (!this.pc) {
        console.log('⏳ No peer connection, queuing ICE candidate');
        this.iceCandidatesQueue.push(candidate);
        return;
      }

      if (!this.pc.remoteDescription || !this.pc.remoteDescription.type) {
        console.log('⏳ Remote description not set, queuing ICE candidate');
        this.iceCandidatesQueue.push(candidate);
        return;
      }

      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('❄️ ICE candidate added');
    } catch (err) {
      if (!this.isIgnoringOffer) {
        console.error('❌ Error adding ICE candidate:', err);
      }
    }
  }

  async processIceCandidatesQueue() {
    if (this.iceCandidatesQueue.length === 0) return;

    console.log(`🔄 Processing ${this.iceCandidatesQueue.length} queued ICE candidates`);
    const queue = [...this.iceCandidatesQueue];
    this.iceCandidatesQueue = [];

    for (const candidate of queue) {
      await this.addIceCandidate(candidate);
    }
  }

  handleConnectionFailed() {
    console.error('💥 Connection failed');
    if (this.onError) {
      this.onError('Connection failed. Please check your network connection.');
    }
    // Note: Do not manually call this.pc.restartIce() here. 
    // The browser automatically tries subsequent ICE candidates (like the TURN server) 
    // when connection drops. Manually restarting it interrupts that process.
    console.log('⏳ Waiting for browser to attempt automatic ICE failover (e.g. via TURN server)...');
  }

  toggleAudio(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
        console.log(`🎤 Audio ${muted ? 'muted' : 'unmuted'}`);
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
        console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`);
      });
    }
  }

  endCall() {
    console.log('🧹 Ending call and cleaning up...');

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`⏹️ Stopped ${track.kind} track`);
      });
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
      this.isScreenSharing = false;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onsignalingstatechange = null;
      this.pc.onnegotiationneeded = null;
      this.pc.close();
      this.pc = null;
    }

    this.remoteStream = null;
    this.iceCandidatesQueue = [];
    this.pendingIceCandidatesToSend = [];
    this._mediaInitPromise = null;
    this.remoteUserId = null;
    this.isInitiator = false;
    this.callId = null;
    this.isMakingOffer = false;
    this.isIgnoringOffer = false;
    this.isManualNegotiation = false;
    this.hasVideo = false;
    this.hasAudio = false;

    // Callbacks
    this.onDataMessage = null;
    this.onNetworkQualityChange = null;
    this.statsInterval = null;
  }

  // --- New Advanced Features ---

  startNetworkQualityMonitoring() {
    if (this.statsInterval) clearInterval(this.statsInterval);

    let lastPacketsLost = 0;
    let lastPacketsReceived = 0;

    this.statsInterval = setInterval(async () => {
      if (!this.pc || this.pc.connectionState !== 'connected') return;

      try {
        const stats = await this.pc.getStats();
        let currentLost = 0;
        let currentReceived = 0;
        let rtt = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            currentLost = report.packetsLost || 0;
            currentReceived = report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          }
        });

        // Calculate delta
        const lostDelta = currentLost - lastPacketsLost;
        const receivedDelta = currentReceived - lastPacketsReceived;
        const totalDelta = lostDelta + receivedDelta;

        lastPacketsLost = currentLost;
        lastPacketsReceived = currentReceived;

        let quality = 'excellent'; // 4 bars

        if (totalDelta > 0) {
          const lossPercentage = (lostDelta / totalDelta) * 100;
          if (lossPercentage > 10 || rtt > 0.5) quality = 'poor'; // 1 bar
          else if (lossPercentage > 5 || rtt > 0.25) quality = 'fair'; // 2 bars
          else if (lossPercentage > 1 || rtt > 0.1) quality = 'good'; // 3 bars
        }

        if (this.onNetworkQualityChange) {
          this.onNetworkQualityChange(quality);
        }

      } catch (err) {
        console.warn('⚠️ Failed to fetch WebRTC stats for network quality:', err);
      }
    }, 2000); // Check every 2 seconds
  }

  setupDataChannel(channel) {
    channel.onopen = () => console.log('📡 DataChannel OPEN');
    channel.onclose = () => console.log('🔴 DataChannel CLOSED');
    channel.onmessage = (event) => {
      if (this.onDataMessage) {
        try {
          const data = JSON.parse(event.data);
          this.onDataMessage(data);
        } catch (e) {
          this.onDataMessage(event.data);
        }
      }
    };
  }

  sendData(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.dataChannel.send(payload);
    } else {
      console.warn('⚠️ Cannot send data: DataChannel not open');
    }
  }

  async toggleScreenShare() {
    if (!this.pc) throw new Error('Peer connection not established');

    if (this.isScreenSharing) {
      // Revert back to camera video
      const videoTrack = this.localStream?.getVideoTracks()[0];
      if (videoTrack) {
        const sender = this.pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
      this.isScreenSharing = false;
      return { stream: this.localStream, isScreenSharing: false };
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];

        // Handle user stopping screen share from the browser UI
        screenTrack.onended = () => {
          this.toggleScreenShare(); // Revert back to camera
          if (this.onScreenShareEnded) this.onScreenShareEnded();
        };

        const sender = this.pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        } else {
          // If the call was audio only, we need to add the track and renegotiate
          this.pc.addTrack(screenTrack, stream);
        }

        this.hasVideo = true; // Fix: ensure renegotiation sends callType='video'

        this.screenStream = stream;
        this.isScreenSharing = true;
        return { stream, isScreenSharing: true };
      } catch (err) {
        console.error('Failed to start screen share:', err);
        throw err;
      }
    }
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;
