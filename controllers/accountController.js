const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');

exports.getDashboard = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user.userId });
    
    const accountIds = accounts.map(acc => acc._id);
    const recentTransactions = await Transaction.find({ accountId: { $in: accountIds } })
      .sort({ createdAt: -1 })
      .limit(10);

    const activeLoans = await Loan.find({ userId: req.user.userId, status: 'active' });

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    res.json({
      accounts,
      recentTransactions,
      activeLoans,
      totalBalance
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user.userId });
    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAccountById = async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};