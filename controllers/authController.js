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


exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const userId = req.user.userId;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // Check email isn't taken by another user
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        fullName: fullName.trim(),
        ...(email && { email: email.toLowerCase().trim() }),
        ...(phone  && { phone: phone.trim() }),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).select('-passwordHash'); // never send password back

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// PATCH /auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
   const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.updatedAt = new Date();
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = req.file.path; // Cloudinary URL

    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: avatarUrl, updatedAt: new Date() },
      { new: true }
    ).select('-passwordHash');

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
};

