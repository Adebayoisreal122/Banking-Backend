const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

router.post('/transfer', authenticateToken, transactionController.transfer);
router.post('/withdraw', authenticateToken, transactionController.withdraw);
router.post('/deposit', authenticateToken, transactionController.deposit);
router.get('/', authenticateToken, transactionController.getTransactions);

module.exports = router;