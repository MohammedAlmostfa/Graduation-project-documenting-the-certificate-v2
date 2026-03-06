// simple in-memory sliding window rate limiter; in production a distributed
// store (Redis, memcached) should be used.
const requests = new Map();

/**
 * Rate Limiting Middleware
 * ------------------------
 * Limits the number of requests from a single client IP within a given time window.
 *
 * @param {number} windowMs - Time window in milliseconds (default: 15 minutes).
 * @param {number} maxRequests - Maximum allowed requests per IP in the time window (default: 100).
 * @returns {Function} Express middleware function.
 */
import { securityConfig } from '../config/security.js';

export const rateLimit = (
  windowMs = securityConfig.rateLimit.windowMs,
  maxRequests = securityConfig.rateLimit.maxRequests
) => {
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress; // Identify client by IP
    const now = Date.now();

    // Initialize request tracking for new clients
    if (!requests.has(clientIp)) {
      requests.set(clientIp, []);
    }

    const clientRequests = requests.get(clientIp);

    // Remove requests older than the current time window
    const windowStart = now - windowMs;
    const recentRequests = clientRequests.filter(time => time > windowStart);

    // Check if client exceeded the maximum allowed requests
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum allowed: ${maxRequests} requests every ${windowMs / 60000} minutes`
      });
    }

    // Record the current request timestamp
    recentRequests.push(now);
    requests.set(clientIp, recentRequests);

    // Optional memory cleanup: remove stale entries if map grows too large
    if (requests.size > 1000) {
      for (const [ip, times] of requests.entries()) {
        if (times.length === 0 || times[times.length - 1] < windowStart) {
          requests.delete(ip);
        }
      }
    }

    next();
  };
};
