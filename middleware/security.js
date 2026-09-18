// Import security middleware packages
const rateLimit = require('express-rate-limit'); // Prevents brute force attacks
const helmet = require('helmet'); // Sets security headers
const mongoSanitize = require('express-mongo-sanitize'); // Prevents NoSQL injection

/**
 * RATE LIMITER FACTORY
 * Creates customizable rate limiting middleware for different endpoints
 * Helps prevent brute force attacks and API abuse
 * @param {Number} windowMs - Time window in milliseconds
 * @param {Number} max - Maximum requests allowed in time window
 * @param {String} message - Error message when limit exceeded
 * @returns {Function} - Express middleware function
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs, // Time window for rate limiting
    max, // Maximum number of requests allowed
    message: {
      success: false,
      message
    }, // Response when limit exceeded
    standardHeaders: true, // Send rate limit info in headers
    legacyHeaders: false, // Don't send legacy X-RateLimit headers
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later.'),
  api: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests from this IP, please try again later.'),
  strict: createRateLimiter(15 * 60 * 1000, 10, 'Too many requests, please try again later.')
};

// Security middleware setup
const setupSecurity = (app) => {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // Sanitize data to prevent NoSQL injection
  app.use(mongoSanitize());

  // Apply general rate limiting
  app.use('/api/', rateLimiters.api);
};

module.exports = { setupSecurity, rateLimiters };