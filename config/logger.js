// Import Winston logging library and Node.js path utilities
const winston = require('winston'); // Professional logging library
const path = require('path'); // Node.js path manipulation

/**
 * LOGS DIRECTORY SETUP
 * Ensures logs directory exists before Winston tries to write to it
 * Prevents runtime errors if logs folder is missing
 */
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir); // Create logs directory if it doesn't exist
}

/**
 * LOG FORMAT CONFIGURATION
 * Defines standardized format for all log entries
 * Combines timestamp, error stack traces, and JSON formatting
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss' // Human-readable timestamp format
  }),
  winston.format.errors({ stack: true }), // Include full error stack traces
  winston.format.json() // Format as JSON for easy parsing and analysis
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'repair-shop-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
  ],
});

// If we're not in production then log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;