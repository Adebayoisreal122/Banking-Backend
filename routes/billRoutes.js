const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { authenticateToken } = require('../middleware/auth');

router.post('/pay', authenticateToken, billController.payBill);
router.get('/', authenticateToken, billController.getBillPayments);

module.exports = router;