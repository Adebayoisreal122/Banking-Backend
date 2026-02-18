const mongoose = require('mongoose');
const Account = require('../models/Account');
const Loan = require('../models/Loan');
const Transaction = require('../models/Transaction');
const { calculateLoanPayment } = require('../utils/helpers');

exports.applyForLoan = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { accountId, loanAmount, termMonths } = req.body;

    if (!accountId || !loanAmount || !termMonths || loanAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid loan details' });
    }

    const interestRate = 5.5;
    const monthlyPayment = calculateLoanPayment(loanAmount, interestRate, termMonths);

    const account = await Account.findOne({ 
      _id: accountId, 
      userId: req.user.userId 
    }).session(session);

    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Account not found' });
    }

    const loan = new Loan({
      userId: req.user.userId,
      accountId: account._id,
      loanAmount,
      interestRate,
      termMonths,
      monthlyPayment,
      outstandingBalance: loanAmount,
      approvedAt: new Date()
    });
    await loan.save({ session });

    const newBalance = account.balance + loanAmount;
    account.balance = newBalance;
    account.updatedAt = new Date();
    await account.save({ session });

    const transaction = new Transaction({
      accountId: account._id,
      transactionType: 'loan_disbursement',
      amount: loanAmount,
      balanceAfter: newBalance,
      description: `Loan approved - ${termMonths} months term`
    });
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({ 
      message: 'Loan approved', 
      loan,
      newBalance 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Loan application error:', error);
    res.status(500).json({ error: 'Loan application failed' });
  } finally {
    session.endSession();
  }
};

exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json(loan);
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


exports.repayLoan = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { loanId, amount, accountId } = req.body;

    if (!loanId || !amount || !accountId || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid repayment details' });
    }

    const loan = await Loan.findOne({
      _id: loanId,
      userId: req.user.userId,
      status: 'active'
    }).session(session);

    if (!loan) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Active loan not found' });
    }

    if (amount > loan.outstandingBalance) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Amount exceeds outstanding balance' });
    }

    const account = await Account.findOne({
      _id: accountId,
      userId: req.user.userId
    }).session(session);

    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Deduct from account
    const newBalance = account.balance - amount;
    account.balance = newBalance;
    account.updatedAt = new Date();
    await account.save({ session });

    // Reduce outstanding loan balance
    loan.outstandingBalance = +(loan.outstandingBalance - amount).toFixed(2);
    if (loan.outstandingBalance <= 0) {
      loan.outstandingBalance = 0;
      loan.status = 'paid';
    }
    await loan.save({ session });

    // Record transaction
    const transaction = new Transaction({
      accountId: account._id,
      transactionType: 'loan_repayment',
      amount,
      balanceAfter: newBalance,
      description: `Loan repayment for loan ${loanId}`
    });
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({
      message: 'Repayment successful',
      loan,
      newBalance
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Loan repayment error:', error);
    res.status(500).json({ error: 'Repayment failed' });
  } finally {
    session.endSession();
  }
};