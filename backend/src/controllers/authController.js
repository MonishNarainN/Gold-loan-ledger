const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, phone, password, address, city, pincode, aadharNumber, panNumber } = req.body;

    // Normalize email and phone
    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedPhone = phone?.trim();

    // Validate required fields
    if (!normalizedEmail || !normalizedPhone) {
      return errorResponse(res, 400, 'Email and phone number are required');
    }

    // Check if user already exists - check email and phone separately for better error messages
    const existingUserByEmail = await User.findOne({ email: normalizedEmail });
    const existingUserByPhone = await User.findOne({ phone: normalizedPhone });

    // Debug logging (remove in production if needed)
    if (existingUserByEmail || existingUserByPhone) {
      console.log('Duplicate check found:', {
        email: normalizedEmail,
        phone: normalizedPhone,
        existingEmail: existingUserByEmail ? existingUserByEmail.email : null,
        existingPhone: existingUserByPhone ? existingUserByPhone.phone : null
      });
    }

    if (existingUserByEmail && existingUserByPhone) {
      return errorResponse(res, 400, 'User already exists with this email and phone number');
    } else if (existingUserByEmail) {
      return errorResponse(res, 400, 'User already exists with this email address');
    } else if (existingUserByPhone) {
      return errorResponse(res, 400, 'User already exists with this phone number');
    }

    // Prepare user data, only including fields that have values
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password
    };

    // Only add optional fields if they exist and are not empty
    if (address && address.trim()) {
      userData.address = address.trim();
    }
    if (city && city.trim()) {
      userData.city = city.trim();
    }
    if (pincode && pincode.trim()) {
      userData.pincode = pincode.trim();
    }
    if (aadharNumber && aadharNumber.trim()) {
      userData.aadharNumber = aadharNumber.trim();
    }
    if (panNumber && panNumber.trim()) {
      userData.panNumber = panNumber.trim().toUpperCase();
    }

    // Create user
    let user;
    try {
      user = await User.create(userData);
    } catch (error) {
      // Handle duplicate key error (in case of race condition)
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern)[0];
        if (duplicateField === 'email') {
          return errorResponse(res, 400, 'User already exists with this email address');
        } else if (duplicateField === 'phone') {
          return errorResponse(res, 400, 'User already exists with this phone number');
        }
        return errorResponse(res, 400, 'User already exists with this information');
      }
      throw error; // Re-throw if it's not a duplicate key error
    }

    // Create welcome notification
    await Notification.create({
      userId: user._id,
      title: 'Welcome to GoldFlow Pro!',
      message: 'Your account has been created successfully. Please wait for admin approval.',
      type: 'INFO'
    });

    // Create admin notification for approval
    const admin = await User.findOne({ role: 'ADMIN' });
    if (admin) {
      await Notification.create({
        userId: admin._id,
        title: 'New User Registration',
        message: `${user.name} has registered and is waiting for approval.`,
        type: 'APPROVAL',
        data: { userId: user._id, userName: user.name }
      });
    }

    successResponse(res, 201, 'Registration successful. Please wait for admin approval.', {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    });
  } catch (error) {
    console.error('Registration error:', error);
    errorResponse(res, 500, 'Registration failed', error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 401, 'Account has been deactivated');
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Generate token
    const token = generateToken(user._id);

    // Create login notification
    await Notification.create({
      userId: user._id,
      title: 'Login Successful',
      message: 'You have successfully logged into your account.',
      type: 'SUCCESS'
    });

    successResponse(res, 200, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        city: user.city,
        pincode: user.pincode,
        aadharNumber: user.aadharNumber,
        panNumber: user.panNumber,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        approvedAt: user.approvedAt
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 500, 'Login failed', error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    successResponse(res, 200, 'User data retrieved successfully', user);
  } catch (error) {
    console.error('Get me error:', error);
    errorResponse(res, 500, 'Failed to retrieve user data', error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Create logout notification
    await Notification.create({
      userId: req.user.id,
      title: 'Logout Successful',
      message: 'You have successfully logged out of your account.',
      type: 'INFO'
    });

    successResponse(res, 200, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    errorResponse(res, 500, 'Logout failed', error);
  }
};

// @desc    Get pending users (Admin only)
// @route   GET /api/auth/pending-users
// @access  Private/Admin
const getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.find({ role: 'PENDING' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Transform _id to id for frontend compatibility
    const transformedUsers = pendingUsers.map(user => ({
      ...user.toObject(),
      id: user._id.toString()
    }));

    successResponse(res, 200, 'Pending users retrieved successfully', transformedUsers);
  } catch (error) {
    console.error('Get pending users error:', error);
    errorResponse(res, 500, 'Failed to retrieve pending users', error);
  }
};

// @desc    Approve/Reject user (Admin only)
// @route   PUT /api/auth/approve-user/:id
// @access  Private/Admin
const approveUser = async (req, res) => {
  try {
    const { approved, comments } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (user.role !== 'PENDING') {
      return errorResponse(res, 400, 'User is not pending approval');
    }

    if (approved) {
      user.role = 'USER';
      user.approvedAt = new Date();
      user.approvedBy = req.user.id;
    } else {
      user.role = 'PENDING';
      user.rejectionReason = comments;
    }

    await user.save();

    // Create notification for user
    await Notification.create({
      userId: user._id,
      title: approved ? 'Account Approved' : 'Account Rejected',
      message: approved 
        ? 'Your account has been approved. You can now access all features.'
        : `Your account has been rejected. Reason: ${comments || 'No reason provided'}`,
      type: approved ? 'SUCCESS' : 'ERROR'
    });

    successResponse(res, 200, `User ${approved ? 'approved' : 'rejected'} successfully`, user);
  } catch (error) {
    console.error('Approve user error:', error);
    errorResponse(res, 500, 'Failed to process user approval', error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  getPendingUsers,
  approveUser
};
