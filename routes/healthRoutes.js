
const express = require('express');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detailed health check with dependencies
router.get('/detailed', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      healthCheck.services.mongodb = { status: 'connected', responseTime: null };
      
      // Test database query performance
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      healthCheck.services.mongodb.responseTime = Date.now() - start;
    } else {
      healthCheck.services.mongodb = { status: 'disconnected', responseTime: null };
      healthCheck.status = 'ERROR';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    healthCheck.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
    };

    // CPU usage (simplified)
    healthCheck.cpu = {
      loadAverage: require('os').loadavg(),
      cpuCount: require('os').cpus().length
    };

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    logger.error('Health check failed', error);
    healthCheck.status = 'ERROR';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});

// Readiness probe (for deployment)
router.get('/ready', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

module.exports = router;
