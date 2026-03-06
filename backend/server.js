const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// CORS - Allow all origins in development
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      /^http:\/\/192\.168\./.test(origin) ||
      /^https:\/\/192\.168\./.test(origin) ||
      /^http:\/\/10\./.test(origin) ||
      /^https:\/\/10\./.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));

// Store active calls in memory
const activeCalls = new Map();
const usersInCalls = new Map();

// Check if HTTPS certificates exist
const sslDir = path.join(__dirname, 'ssl');
const keyPath = path.join(sslDir, 'key.pem');
const certPath = path.join(sslDir, 'cert.pem');

let server;
let isHTTPS = false;

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  // HTTPS mode
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  server = https.createServer(options, app);
  isHTTPS = true;
  console.log('🔒 HTTPS mode enabled');
} else {
  // HTTP mode (for localhost development only)
  server = http.createServer(app);
  console.log('⚠️  HTTP mode - Video calls will only work on localhost');
  console.log('   To enable HTTPS for local network, run: mkdir ssl && openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes');
}

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userId} (Socket: ${socket.id})`);

  // Join user-specific room for direct signaling
  socket.join(`user-${socket.userId}`);

  // Register user presence
  socket.on('register', (data) => {
    const { userId, name } = data;
    socket.userData = { userId, name, socketId: socket.id };
    io.emit('user-online', { userId, name });
    console.log(`👤 User registered: ${name} (${userId})`);
  });

  // Get currently online users
  socket.on('get-online-users', () => {
    const onlineUsers = Array.from(io.sockets.sockets.values())
      .map(s => s.userId)
      .filter(id => id);
    socket.emit('online-users-list', [...new Set(onlineUsers)]);
  });

  // ==================== WEBRTC SIGNALING ====================

  // 1. Call initiation (Caller → Server → Callee)
  socket.on('call-user', (data) => {
    const { userToCall, offer, callType = 'video', callId: existingCallId, renegotiation = false } = data;
    const callerId = socket.userId;

    console.log(`📞 Call initiated: ${callerId} → ${userToCall}, renegotiation: ${renegotiation}`);

    if (!renegotiation) {
      if (String(callerId) === String(userToCall)) {
        console.error('❌ User tried to call themselves!');
        socket.emit('call-error', { message: 'Cannot call yourself' });
        return;
      }

      if (usersInCalls.has(callerId)) {
        console.error(`❌ Caller ${callerId} is already in a call`);
        socket.emit('call-error', { message: 'You are already in a call. End it first.' });
        return;
      }

      const calleeRoom = io.sockets.adapter.rooms.get(`user-${userToCall}`);
      if (!calleeRoom || calleeRoom.size === 0) {
        console.log(`❌ User ${userToCall} is offline`);
        socket.emit('call-error', { message: 'User is offline' });
        return;
      }

      if (usersInCalls.has(userToCall)) {
        console.log(`❌ User ${userToCall} is already in a call`);
        socket.emit('call-error', { message: 'User is already in a call' });
        return;
      }
    }

    const callId = existingCallId || `${callerId}-${userToCall}-${Date.now()}`;

    if (!renegotiation) {
      activeCalls.set(callId, {
        callId,
        caller: callerId,
        callee: userToCall,
        participants: [callerId, userToCall],
        status: 'ringing',
        startTime: null,
        callType,
        callerSocket: socket.id
      });

      usersInCalls.set(callerId, callId);
      usersInCalls.set(userToCall, callId);
      socket.currentCallId = callId;
      console.log(`✅ Call ${callId} created. Forwarding to user-${userToCall}`);
    }

    io.to(`user-${userToCall}`).emit('incoming-call', {
      callId,
      offer,
      from: callerId,
      callerName: socket.userData?.name || 'Unknown',
      callType,
      renegotiation
    });

    if (!renegotiation) {
      socket.emit('call-ringing', { callId, to: userToCall });
    }
  });

  // 2. Call acceptance (Callee → Server → Caller)
  socket.on('accept-call', (data) => {
    const { callId, answer, to } = data;
    const callData = activeCalls.get(callId);

    if (!callData) {
      socket.emit('call-error', { message: 'Call not found or expired' });
      return;
    }

    if (String(callData.callee) !== String(socket.userId)) {
      socket.emit('call-error', { message: 'Not authorized to accept this call' });
      return;
    }

    console.log(`✅ Call accepted: ${callId} by ${socket.userId}`);

    callData.status = 'connected';
    callData.startTime = Date.now();
    callData.calleeSocket = socket.id;
    activeCalls.set(callId, callData);
    socket.currentCallId = callId;

    io.to(`user-${callData.caller}`).emit('call-accepted', {
      callId,
      answer,
      from: socket.userId
    });

    io.to(`user-${callData.caller}`).to(`user-${callData.callee}`).emit('call-connected', {
      callId,
      startTime: callData.startTime
    });

    console.log(`📞 Call ${callId} fully connected between ${callData.caller} and ${callData.callee}`);
  });

  // 3. Call rejection (Callee → Server → Caller)
  socket.on('reject-call', (data) => {
    const { callId, reason = 'rejected' } = data;
    const callData = activeCalls.get(callId);

    if (callData) {
      console.log(`❌ Call rejected: ${callId} (${reason})`);
      io.to(`user-${callData.caller}`).emit('call-rejected', {
        callId,
        reason,
        from: socket.userId
      });
      callData.participants.forEach(pid => usersInCalls.delete(pid));
      activeCalls.delete(callId);
    }
  });

  // 4. End call (Either party → Server → Both)
  socket.on('end-call', (data) => {
    const { callId } = data;
    const callData = activeCalls.get(callId);

    if (callData) {
      const duration = callData.startTime ? Date.now() - callData.startTime : 0;
      console.log(`📴 Call ended: ${callId}, Duration: ${duration}ms, Ended by: ${socket.userId}`);

      io.to(`user-${callData.caller}`).to(`user-${callData.callee}`).emit('call-ended', {
        callId,
        duration,
        endedBy: socket.userId
      });

      callData.participants.forEach(pid => usersInCalls.delete(pid));
      saveCallHistory(callData, duration).catch(console.error);
      activeCalls.delete(callId);
    }
  });

  // 5. ICE Candidate exchange
  socket.on('ice-candidate', (data) => {
    const { to, candidate, callId } = data;
    console.log(`❄️ ICE candidate from ${socket.userId} to ${to}`);
    io.to(`user-${to}`).emit('ice-candidate', {
      candidate,
      from: socket.userId,
      callId
    });
  });

  // 6. Handle call cancellation
  socket.on('cancel-call', (data) => {
    const { callId } = data;
    const callData = activeCalls.get(callId);

    if (callData && String(callData.caller) === String(socket.userId)) {
      console.log(`📞 Call cancelled: ${callId}`);
      io.to(`user-${callData.callee}`).emit('call-cancelled', { callId });
      callData.participants.forEach(pid => usersInCalls.delete(pid));
      activeCalls.delete(callId);
    }
  });

  // ==================== CHAT MESSAGING ====================

  socket.on('typing', (data) => {
    const { swapRequestId, isTyping } = data;
    socket.to(`chat-${swapRequestId}`).emit('user-typing', {
      userId: socket.userId,
      isTyping
    });
  });

  socket.on('join-chat', (swapRequestId) => {
    socket.join(`chat-${swapRequestId}`);
    console.log(`User ${socket.userId} joined chat: ${swapRequestId}`);
  });

  socket.on('leave-chat', (swapRequestId) => {
    socket.leave(`chat-${swapRequestId}`);
    console.log(`User ${socket.userId} left chat: ${swapRequestId}`);
  });

  socket.on('send-message', async (data) => {
    const { swapRequestId, content, tempId } = data;
    const senderId = socket.userId;
    const senderName = socket.userData?.name || 'Unknown';

    io.to(`chat-${swapRequestId}`).emit('new-message', {
      _id: `socket-${Date.now()}`,
      content,
      sender: {
        _id: senderId,
        name: senderName
      },
      swapRequest: swapRequestId,
      createdAt: new Date().toISOString(),
      tempId: tempId || null
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.userId}, Reason: ${reason}`);

    const userCallId = usersInCalls.get(socket.userId);
    if (userCallId) {
      const callData = activeCalls.get(userCallId);
      if (callData) {
        console.log(`📴 Auto-ending call ${userCallId} due to disconnect`);
        const otherParty = callData.participants.find(id => String(id) !== String(socket.userId));
        io.to(`user-${otherParty}`).emit('call-ended', {
          callId: userCallId,
          reason: 'peer-disconnected',
          duration: callData.startTime ? Date.now() - callData.startTime : 0
        });
        callData.participants.forEach(pid => usersInCalls.delete(pid));
        saveCallHistory(callData, callData.startTime ? Date.now() - callData.startTime : 0).catch(console.error);
        activeCalls.delete(userCallId);
      }
    }

    io.emit('user-offline', { userId: socket.userId });
  });
});

// Helper function to save call history
async function saveCallHistory(callData, duration) {
  try {
    const CallHistory = require('./models/CallHistory');
    await CallHistory.create({
      callId: callData.callId,
      caller: callData.caller,
      callee: callData.callee,
      startTime: new Date(callData.startTime || Date.now()),
      endTime: new Date(),
      duration: Math.floor(duration / 1000),
      status: duration > 0 ? 'completed' : 'missed',
      callType: callData.callType
    });
    console.log(`💾 Call history saved: ${callData.callId}`);
  } catch (err) {
    console.error('Failed to save call history:', err);
  }
}

// Make io accessible to controllers
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/swap-requests', require('./routes/swapRequestRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/otp', require('./routes/otpRoutes'));
app.use('/api/calls', require('./routes/callRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  const protocol = isHTTPS ? 'https' : 'http';
  console.log(`🚀 Server running on ${protocol}://${HOST}:${PORT}`);
  console.log(`📱 For mobile access, use: ${protocol}://YOUR_COMPUTER_IP:${PORT}`);
  if (!isHTTPS) {
    console.log(`⚠️  To enable HTTPS for video calls on local network:`);
    console.log(`   1. mkdir ssl`);
    console.log(`   2. openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes`);
    console.log(`   3. Restart server`);
  }
});
