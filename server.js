const dotenv = require('dotenv');
dotenv.config();

// ===== IMPORT CORE DEPENDENCIES =====
const express = require('express'); // Web framework
const mongoose = require('mongoose'); // MongoDB ODM
const cors = require('cors'); // Cross-Origin Resource Sharing
const connectDB = require('./config/db'); // Database connection
const logger = require('./config/logger'); // Winston logging system
const { specs, swaggerUi } = require('./config/swagger'); // API documentation UI and Swagger configuration
const { setupSecurity} = require('./middleware/security'); // Security headers and rate limiting

// ===== IMPORT ROUTES =====
const authRoutes = require('./routes/authRoutes'); // Authentication routes
const userRoutes = require('./routes/userRoutes'); // User-related routes
const companyRoutes = require('./routes/companyRoutes');
const roleTransitionRoutes = require('./routes/roleTransitionRoutes'); // Role transition routes
const driverRoutes = require('./routes/driverRoutes');
const truckRoutes = require('./routes/truckRoutes');
const jobCardRoutes = require('./routes/jobCardRoutes');
const healthRoutes = require('./routes/healthRoutes');
const storeRoutes = require('./routes/storeRoutes');
const cartRoutes = require('./routes/cartRoutes');
const adminPanelRoutes = require('./routes/adminPanelRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Initialize Express application
const app = express();

/**
 * DATABASE CONNECTION
 * Establishes connection to MongoDB using Mongoose
 * Handles connection errors and logs success/failure
 */
connectDB();

// ===== SECURITY SETUP =====
setupSecurity(app);

// ===== MIDDLEWARE SETUP =====
app.use(express.json({ limit: '10mb' })); // Parses JSON data in requests with size limit
app.use(cors()); // Enables cross-origin resource sharing

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  next();
});

// ===== API DOCUMENTATION =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// ===== HEALTH CHECK ROUTES =====
app.use('/health', healthRoutes);

// ===== API ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/role-transition', roleTransitionRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/jobcard', jobCardRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminPanelRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

// ===== ROOT ROUTE =====
app.get('/', (req, res) => {
    res.json({
        message: 'Repair Shop Management API',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health'
    });
});

// ===== ERROR HANDLING MIDDLEWARE =====
const errorHandler = (err, req, res) => {
    console.error(err.stack);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ 
            success: false, 
            error: 'Validation Error', 
            message: errors.join(', ') 
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            error: 'Duplicate Error',
            message: `${field} already exists`
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid Token',
            message: 'Please login again'
        });
    }

    // Log the error using Winston logger
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

    // Generic error response
    res.status(err.status || 500).json({ 
        success: false,
        error: 'Server Error', 
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message 
    });
};

app.use(errorHandler);

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGINT', async () => {
    console.log('Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed. Exiting process.');
    process.exit(0);
});

// ===== SERVER STARTUP =====
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
    console.log(`⚡ WebSocket Server: ws://localhost:${PORT}/ws`);
});

// ===== WEBSOCKET SETUP =====
const realTimeTracker = require('./utils/realTimeTracker');
realTimeTracker.initialize(server);