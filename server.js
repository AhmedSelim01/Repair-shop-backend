// server.js
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { specs, swaggerUi } = require('./config/swagger');
const { setupSecurity } = require('./middleware/security');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const companyRoutes = require('./routes/companyRoutes');
const driverRoutes = require('./routes/driverRoutes');
const truckRoutes = require('./routes/truckRoutes');
const jobCardRoutes = require('./routes/jobCardRoutes');
const healthRoutes = require('./routes/healthRoutes');
const storeRoutes = require('./routes/storeRoutes');
const cartRoutes = require('./routes/cartRoutes');
const adminPanelRoutes = require('./routes/adminPanelRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const upgradeRoutes = require('./routes/updateRoutes');

const app = express();

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}
setupSecurity(app);

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users/upgrade', upgradeRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/jobcard', jobCardRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminPanelRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'Repair Shop Management API',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health'
    });
});

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ success: false, error: 'Validation Error', message: errors.join(', ') });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        return res.status(400).json({ success: false, error: 'Duplicate Error', message: `${field || 'Field'} already exists` });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'Invalid Token', message: 'Please login again' });
    }

    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

    res.status(err.status || 500).json({ success: false, error: 'Server Error', message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message });
};

app.use(errorHandler);

process.on('SIGINT', async () => {
    console.log('Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed. Exiting process.');
    process.exit(0);
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
        console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
        console.log(`⚡ WebSocket Server: ws://localhost:${PORT}/ws`);
    });

    const realTimeTracker = require('./utils/realTimeTracker');
    realTimeTracker.initialize(server);
}
module.exports = app;