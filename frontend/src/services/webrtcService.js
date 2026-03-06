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
      ],
      iceCandidatePoolSize: 10
    };
  }

  async initializeMedia(constraints = { video: true, audio: true }) {
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

      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera or microphone found on this device. Please connect a camera/microphone or use a different device.';
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
          console.log('⏳ Socket or remoteUserId not ready, queuing ICE candidate');
          this.iceCandidatesQueue.push(event.candidate);
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
    return new Promise((resolve) => {
      if (!this.pc || this.pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (!this.pc || this.pc.iceGatheringState === 'complete') {
          if (this.pc) this.pc.removeEventListener('icegatheringstatechange', checkState);
          console.log('⏱️ ICE gathering complete');
          resolve();
        }
      };

      this.pc.addEventListener('icegatheringstatechange', checkState);
      setTimeout(() => {
        if (this.pc) this.pc.removeEventListener('icegatheringstatechange', checkState);
        console.log('⏱️ ICE gathering timeout, proceeding');
        resolve();
      }, 3000);
    });
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
    if (this.pc) {
      this.pc.restartIce();
    }
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
  }

  // --- New Advanced Features ---

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
