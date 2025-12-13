const mongoose = require('mongoose');
const Account = require('../models/Account');
const BillPayment = require('../models/BillPayment');
const Transaction = require('../models/Transaction');

exports.payBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { accountId, billerName, amount, referenceNumber } = req.body;

    if (!accountId || !billerName || !amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid payment details' });
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

    const billPayment = new BillPayment({
      accountId: account._id,
      billerName,
      amount,
      referenceNumber
    });
    await billPayment.save({ session });

    const transaction = new Transaction({
      accountId: account._id,
      transactionType: 'bill_payment',
      amount,
      balanceAfter: newBalance,
      description: `Bill payment to ${billerName}`
    });
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({ message: 'Bill payment successful', newBalance });
  } catch (error) {
    await session.abortTransaction();
    console.error('Bill payment error:', error);
    res.status(500).json({ error: 'Payment failed' });
  } finally {
    session.endSession();
  }
};

exports.getBillPayments = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user.userId });
    const accountIds = accounts.map(acc => acc._id);

    const billPayments = await BillPayment.find({ accountId: { $in: accountIds } })
      .sort({ paymentDate: -1 })
      .limit(50);

    res.json(billPayments);
  } catch (error) {
    console.error('Get bill payments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};