const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, accountController.getDashboard);
router.get('/', authenticateToken, accountController.getAccounts);
router.get('/:id', authenticateToken, accountController.getAccountById);

module.exports = router;