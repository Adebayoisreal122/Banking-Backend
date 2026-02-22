const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/signup',  authLimiter, authController.signup);
router.post('/signin',  authLimiter, authController.signin);
router.get('/profile',  authenticateToken, authController.getProfile);
router.patch('/profile',         authenticateToken, authController.updateProfile);   
router.patch('/change-password', authenticateToken, authController.changePassword);  

module.exports = router;



