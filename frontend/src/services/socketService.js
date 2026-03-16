import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnecting = false;
    this.connectionCallbacks = [];
  }

  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    if (this.isConnecting) {
      console.log('Connection in progress...');
      return new Promise((resolve) => {
        this.connectionCallbacks.push(resolve);
      });
    }

    this.isConnecting = true;

    // Use environment variable for socket URL, or match the current window's protocol
    const socketUrl = process.env.REACT_APP_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

    console.log('Connecting to socket:', socketUrl);

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'], // Try polling first, upgrade to WS
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnecting = false;
      this.connectionCallbacks.forEach(cb => cb(this.socket));
      this.connectionCallbacks = [];
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      this.isConnecting = false;
    });

    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  register(userId, name) {
    if (this.socket?.connected) {
      this.socket.emit('register', { userId, name });
      console.log('Registered with socket:', name);
      return true;
    }
    console.warn('Cannot register: socket not connected');
    return false;
  }

  joinChat(swapRequestId) {
    if (this.socket?.connected) {
      this.socket.emit('join-chat', swapRequestId);
      console.log('Joined chat room:', swapRequestId);
    }
  }

  leaveChat(swapRequestId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-chat', swapRequestId);
      console.log('Left chat room:', swapRequestId);
    }
  }

  sendTyping(swapRequestId, isTyping) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { swapRequestId, isTyping });
    }
  }

  sendMessage(swapRequestId, content, tempId) {
    if (this.socket?.connected) {
      this.socket.emit('send-message', { swapRequestId, content, tempId });
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    this.socket?.on(event, callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      console.log('Socket disconnected manually');
    }
  }
}

// Create instance and export as default
const socketService = new SocketService();
export default socketService;
