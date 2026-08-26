const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectMongo = require('./config/db');
const { sequelize, testConnection } = require('./config/pgDb');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/corridors', require('./routes/corridors'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/mock', require('./routes/mockData'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectMongo();
    console.log('✅ MongoDB connected');

    // Connect PostgreSQL
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('✅ PostgreSQL connected & synced');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 AI Engine expected at ${process.env.AI_ENGINE_URL || 'http://localhost:8000'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    // Start server anyway even if DBs fail (for development flexibility)
    app.listen(PORT, () => {
      console.log(`⚠️ Server running on port ${PORT} (some DB connections failed)`);
    });
  }
};

startServer();

module.exports = app;
