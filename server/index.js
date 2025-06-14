const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  credentials: true
}));
app.use(express.json());

// Store connected users and their socket IDs
const connectedUsers = new Map();
const userSockets = new Map();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Get list of online users
app.get('/users/online', (req, res) => {
  const onlineUsers = Array.from(connectedUsers.keys());
  res.json({ users: onlineUsers });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (userData) => {
    const { username, isAuthenticated } = userData;
    console.log(`👤 User joined: ${username} (${isAuthenticated ? 'authenticated' : 'guest'})`);
    
    // Store user information
    connectedUsers.set(username, {
      socketId: socket.id,
      isAuthenticated,
      joinedAt: new Date().toISOString()
    });
    userSockets.set(socket.id, username);
    
    // Join user to their own room for private messages
    socket.join(`user_${username}`);
    
    // Broadcast updated user list to all clients
    const onlineUsers = Array.from(connectedUsers.keys());
    io.emit('users_updated', onlineUsers);
    
    console.log(`📊 Total connected users: ${connectedUsers.size}`);
  });

  // Handle private messages
  socket.on('private_message', (messageData) => {
    const { to, from, message, timestamp } = messageData;
    console.log(`💬 Private message from ${from} to ${to}: ${message}`);
    
    // Send message to recipient if they're online
    const recipient = connectedUsers.get(to);
    if (recipient) {
      // Send to recipient
      io.to(`user_${to}`).emit('private_message', {
        from,
        to,
        message,
        timestamp,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      // Send confirmation back to sender
      socket.emit('message_sent', {
        to,
        message,
        timestamp,
        status: 'delivered'
      });
      
      console.log(`✅ Message delivered to ${to}`);
    } else {
      // User is offline, send error back to sender
      socket.emit('message_error', {
        to,
        message,
        error: 'User is offline',
        timestamp
      });
      
      console.log(`❌ User ${to} is offline`);
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { to, from } = data;
    const recipient = connectedUsers.get(to);
    if (recipient) {
      io.to(`user_${to}`).emit('user_typing', { from, typing: true });
    }
  });

  socket.on('typing_stop', (data) => {
    const { to, from } = data;
    const recipient = connectedUsers.get(to);
    if (recipient) {
      io.to(`user_${to}`).emit('user_typing', { from, typing: false });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = userSockets.get(socket.id);
    if (username) {
      console.log(`👋 User disconnected: ${username}`);
      connectedUsers.delete(username);
      userSockets.delete(socket.id);
      
      // Broadcast updated user list
      const onlineUsers = Array.from(connectedUsers.keys());
      io.emit('users_updated', onlineUsers);
      
      console.log(`📊 Total connected users: ${connectedUsers.size}`);
    } else {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Fellowship Finder Chat Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🌐 CORS enabled for localhost:5173, localhost:3000, 127.0.0.1:5173`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});