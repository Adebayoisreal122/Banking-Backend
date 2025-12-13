const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 100, // production stays tight, dev gets breathing room
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 5, // increase or disable entirely during dev
  message: 'Too many authentication attempts, please try again later.'
});

module.exports = { generalLimiter, authLimiter };
