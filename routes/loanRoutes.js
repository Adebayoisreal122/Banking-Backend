const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { authenticateToken } = require('../middleware/auth');

router.post('/apply', authenticateToken, loanController.applyForLoan);
router.get('/', authenticateToken, loanController.getLoans);
router.get('/:id', authenticateToken, loanController.getLoanById);

module.exports = router;