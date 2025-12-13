const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

exports.transfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { fromAccountId, toAccountNumber, amount, description } = req.body;

    if (!fromAccountId || !toAccountNumber || !amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid transfer details' });
    }

    const fromAccount = await Account.findOne({ 
      _id: fromAccountId, 
      userId: req.user.userId,
      status: 'active'
    }).session(session);

    if (!fromAccount) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Account not found' });
    }

    if (fromAccount.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    const toAccount = await Account.findOne({ 
      accountNumber: toAccountNumber,
      status: 'active'
    }).session(session);

    if (!toAccount) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Recipient account not found' });
    }

    const newSenderBalance = fromAccount.balance - amount;
    fromAccount.balance = newSenderBalance;
    fromAccount.updatedAt = new Date();
    await fromAccount.save({ session });

    const newRecipientBalance = toAccount.balance + amount;
    toAccount.balance = newRecipientBalance;
    toAccount.updatedAt = new Date();
    await toAccount.save({ session });

    const senderTransaction = new Transaction({
      accountId: fromAccount._id,
      transactionType: 'transfer_out',
      amount,
      balanceAfter: newSenderBalance,
      description,
      recipientAccount: toAccountNumber
    });
    await senderTransaction.save({ session });

    const recipientTransaction = new Transaction({
      accountId: toAccount._id,
      transactionType: 'transfer_in',
      amount,
      balanceAfter: newRecipientBalance,
      description: description || 'Transfer received'
    });
    await recipientTransaction.save({ session });

    await session.commitTransaction();

    res.json({ message: 'Transfer successful', newBalance: newSenderBalance });
  } catch (error) {
    await session.abortTransaction();
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  } finally {
    session.endSession();
  }
};

exports.withdraw = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { accountId, amount, description } = req.body;

    if (!accountId || !amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid withdrawal details' });
    }

    const account = await Account.findOne({ 
      _id: accountId, 
      userId: req.user.userId,
      status: 'active'
    }).session(session);

    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    const newBalance = account.balance - amount;
    account.balance = newBalance;
    account.updatedAt = new Date();
    await account.save({ session });

    const transaction = new Transaction({
      accountId: account._id,
      transactionType: 'withdrawal',
      amount,
      balanceAfter: newBalance,
      description: description || 'ATM Withdrawal'
    });
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({ message: 'Withdrawal successful', newBalance });
  } catch (error) {
    await session.abortTransaction();
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Withdrawal failed' });
  } finally {
    session.endSession();
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { accountId, limit = 50 } = req.query;

    let query = {};
    if (accountId) {
      const account = await Account.findOne({ _id: accountId, userId: req.user.userId });
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }
      query.accountId = accountId;
    } else {
      const accounts = await Account.find({ userId: req.user.userId });
      const accountIds = accounts.map(acc => acc._id);
      query.accountId = { $in: accountIds };
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};




// Add this to controllers/transactionController.js

exports.deposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { accountId, amount, description } = req.body;

    if (!accountId || !amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid deposit details' });
    }

    const account = await Account.findOne({ 
      _id: accountId, 
      userId: req.user.userId,
      status: 'active'
    }).session(session);

    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Account not found' });
    }

    const newBalance = account.balance + amount;
    account.balance = newBalance;
    account.updatedAt = new Date();
    await account.save({ session });

    const transaction = new Transaction({
      accountId: account._id,
      transactionType: 'deposit',
      amount,
      balanceAfter: newBalance,
      description: description || 'Cash Deposit'
    });
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({ message: 'Deposit successful', newBalance });
  } catch (error) {
    await session.abortTransaction();
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Deposit failed' });
  } finally {
    session.endSession();
  }
};

// Add this route to routes/transactionRoutes.js
// router.post('/deposit', authenticateToken, transactionController.deposit);