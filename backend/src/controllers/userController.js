const User = require('../models/User');
const Loan = require('../models/Loan');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'Users retrieved successfully', users);
  } catch (error) {
    console.error('Get all users error:', error);
    errorResponse(res, 500, 'Failed to retrieve users', error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    successResponse(res, 200, 'User retrieved successfully', user);
  } catch (error) {
    console.error('Get user error:', error);
    errorResponse(res, 500, 'Failed to retrieve user', error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;

    // Users can only update their own profile unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.role;
    delete updateData.isActive;
    delete updateData.approvedAt;
    delete updateData.approvedBy;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Create notification
    await Notification.create({
      userId: user._id,
      title: 'Profile Updated',
      message: 'Your profile has been updated successfully.',
      type: 'SUCCESS'
    });

    successResponse(res, 200, 'Profile updated successfully', user);
  } catch (error) {
    console.error('Update profile error:', error);
    errorResponse(res, 500, 'Failed to update profile', error);
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user.id === userId) {
      return errorResponse(res, 400, 'Cannot delete your own account');
    }

    const user = await User.findById(userId);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Check if user has active loans
    const activeLoans = await Loan.find({ 
      userId: userId, 
      status: { $in: ['PENDING', 'ACTIVE'] } 
    });

    if (activeLoans.length > 0) {
      return errorResponse(res, 400, 'Cannot delete user with active loans');
    }

    // Soft delete - deactivate user instead of hard delete
    user.isActive = false;
    await user.save();

    // Create notification
    await Notification.create({
      userId: user._id,
      title: 'Account Deactivated',
      message: 'Your account has been deactivated by an administrator.',
      type: 'ERROR'
    });

    successResponse(res, 200, 'User deactivated successfully');
  } catch (error) {
    console.error('Delete user error:', error);
    errorResponse(res, 500, 'Failed to delete user', error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;

    // Users can only view their own stats unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    const [loans, transactions] = await Promise.all([
      Loan.find({ userId }),
      Transaction.find({ userId })
    ]);

    const stats = {
      totalLoans: loans.length,
      activeLoans: loans.filter(loan => loan.status === 'ACTIVE').length,
      completedLoans: loans.filter(loan => loan.status === 'COMPLETED').length,
      overdueLoans: loans.filter(loan => loan.status === 'OVERDUE').length,
      totalLoanAmount: loans.reduce((sum, loan) => sum + loan.principalAmount, 0),
      totalPaid: transactions
        .filter(t => t.type === 'INTEREST_PAYMENT' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0),
      totalTransactions: transactions.length
    };

    successResponse(res, 200, 'User statistics retrieved successfully', stats);
  } catch (error) {
    console.error('Get user stats error:', error);
    errorResponse(res, 500, 'Failed to retrieve user statistics', error);
  }
};

module.exports = {
  getAllUsers,
  getUser,
  updateProfile,
  deleteUser,
  getUserStats
};
