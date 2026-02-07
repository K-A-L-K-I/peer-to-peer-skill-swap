const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const swapRequestRoutes = require('./routes/swapRequestRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const reportRoutes = require('./routes/reportRoutes');
dotenv.config();

const app = express();

connectDB();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/swap-requests', swapRequestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Skill Swap API is running' });
});

app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});
