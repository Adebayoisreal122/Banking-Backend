const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const { generateAccountNumber } = require('../utils/helpers');

exports.signup = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      email,
      passwordHash: hashedPassword,
      fullName,
      phone
    });
    await user.save({ session });

    const accountNumber = generateAccountNumber();
    const account = new Account({
      userId: user._id,
      accountNumber,
      accountType: 'savings'
    });
    await account.save({ session });

    await session.commitTransaction();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
console.log("JWT Secret in use:", process.env.JWT_SECRET);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, email: user.email, fullName: user.fullName }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    session.endSession();
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
// console.log("JWT Secret in use:", process.env.JWT_SECRET);

    res.json({
      token,
      user: { id: user._id, email: user.email, fullName: user.fullName }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};