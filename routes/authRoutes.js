const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/signup', authLimiter, authController.signup);
router.post('/signin', authLimiter, authController.signin);
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;