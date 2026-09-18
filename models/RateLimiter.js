const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter for password reset requests
const passwordResetLimiter = new RateLimiterMemory({
    points: 5, // 5 requests
    duration: 86400, // 24 hours (in seconds)
});

module.exports = passwordResetLimiter;