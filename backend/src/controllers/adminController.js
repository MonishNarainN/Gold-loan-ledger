const User = require('../models/User');
const Loan = require('../models/Loan');
const Transaction = require('../models/Transaction');
const RenewalRequest = require('../models/RenewalRequest');
const Notification = require('../models/Notification');
const SystemSettings = require('../models/SystemSettings');
const { successResponse, errorResponse } = require('../utils/response');

// @desc    Get admin dashboard data
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardData = async (req, res) => {
  try {
    const [
      totalUsers,
      totalLoans,
      totalTransactions,
      pendingUsers,
      activeLoans,
      overdueLoans,
      recentLoans,
      recentTransactions
    ] = await Promise.all([
      User.countDocuments(),
      Loan.countDocuments(),
      Transaction.countDocuments(),
      User.countDocuments({ role: 'PENDING' }),
      Loan.countDocuments({ status: 'ACTIVE' }),
      Loan.countDocuments({ status: 'OVERDUE' }),
      Loan.find()
        .populate('userId', 'name email')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      Transaction.find()
        .populate('loanId', 'loanNumber customer')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Calculate financial data
    const loans = await Loan.find();
    const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);
    
    const completedTransactions = await Transaction.find({ 
      type: 'INTEREST_PAYMENT', 
      status: 'COMPLETED' 
    });
    const totalInterestEarned = completedTransactions.reduce((sum, t) => sum + t.amount, 0);

    const dashboardData = {
      totalUsers,
      totalLoans,
      totalTransactions,
      pendingApprovals: pendingUsers,
      activeLoans,
      overdueLoans,
      totalLoanAmount,
      totalInterestEarned,
      recentLoans,
      recentTransactions,
      pendingUsers: await User.find({ role: 'PENDING' })
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(10)
    };

    successResponse(res, 200, 'Dashboard data retrieved successfully', dashboardData);
  } catch (error) {
    console.error('Get dashboard data error:', error);
    errorResponse(res, 500, 'Failed to retrieve dashboard data', error);
  }
};

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Private/Admin
const getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    // Transform _id to id for frontend compatibility
    const transformedCustomers = customers.map(user => ({
      ...user.toObject(),
      id: user._id.toString()
    }));

    successResponse(res, 200, 'All users retrieved successfully', transformedCustomers);
  } catch (error) {
    console.error('Get all customers error:', error);
    errorResponse(res, 500, 'Failed to retrieve customers', error);
  }
};

// @desc    Get all loans with filters
// @route   GET /api/admin/loans
// @access  Private/Admin
const getAllLoansWithFilters = async (req, res) => {
  try {
    const { status, userId, startDate, endDate } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const loans = await Loan.find(query)
      .populate('userId', 'name email phone')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'Loans retrieved successfully', loans);
  } catch (error) {
    console.error('Get all loans with filters error:', error);
    errorResponse(res, 500, 'Failed to retrieve loans', error);
  }
};

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    successResponse(res, 200, 'System settings retrieved successfully', settings);
  } catch (error) {
    console.error('Get system settings error:', error);
    errorResponse(res, 500, 'Failed to retrieve system settings', error);
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSystemSettings = async (req, res) => {
  try {
    const updateData = req.body;

    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create(updateData);
    } else {
      settings = await SystemSettings.findByIdAndUpdate(
        settings._id,
        updateData,
        { new: true, runValidators: true }
      );
    }

    successResponse(res, 200, 'System settings updated successfully', settings);
  } catch (error) {
    console.error('Update system settings error:', error);
    errorResponse(res, 500, 'Failed to update system settings', error);
  }
};

// @desc    Get all renewal requests
// @route   GET /api/admin/renewals
// @access  Private/Admin
const getAllRenewalRequests = async (req, res) => {
  try {
    const renewals = await RenewalRequest.find()
      .populate('userId', 'name email phone')
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'Renewal requests retrieved successfully', renewals);
  } catch (error) {
    console.error('Get all renewal requests error:', error);
    errorResponse(res, 500, 'Failed to retrieve renewal requests', error);
  }
};

// @desc    Update renewal request status
// @route   PUT /api/admin/renewals/:id/status
// @access  Private/Admin
const updateRenewalStatus = async (req, res) => {
  try {
    const renewalId = req.params.id;
    const { status, comments } = req.body;

    const renewal = await RenewalRequest.findById(renewalId)
      .populate('userId', 'name email')
      .populate('loanId', 'loanNumber customer');

    if (!renewal) {
      return errorResponse(res, 404, 'Renewal request not found');
    }

    renewal.status = status;
    renewal.processedBy = req.user.id;
    renewal.processedAt = new Date();
    
    if (status === 'APPROVED') {
      renewal.comments = comments;
    } else if (status === 'REJECTED') {
      renewal.rejectionReason = comments;
    }

    await renewal.save();

    // Create notification
    await Notification.create({
      userId: renewal.userId._id,
      title: `Renewal Request ${status}`,
      message: `Your renewal request for loan ${renewal.loanId.loanNumber} has been ${status.toLowerCase()}.`,
      type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR',
      data: { 
        renewalId: renewal._id,
        loanId: renewal.loanId._id,
        status
      }
    });

    successResponse(res, 200, `Renewal request ${status.toLowerCase()} successfully`, renewal);
  } catch (error) {
    console.error('Update renewal status error:', error);
    errorResponse(res, 500, 'Failed to update renewal status', error);
  }
};

// @desc    Get user dashboard data (for admin to view specific user)
// @route   GET /api/admin/users/:userId/dashboard
// @access  Private/Admin
const getUserDashboardData = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get user details
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Get user's loans
    const loans = await Loan.find({ userId })
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    // Get user's transactions
    const transactions = await Transaction.find({ userId })
      .populate('loanId', 'loanNumber customer')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      totalLoans: loans.length,
      activeLoans: loans.filter(loan => loan.status === 'ACTIVE').length,
      completedLoans: loans.filter(loan => loan.status === 'COMPLETED').length,
      overdueLoans: loans.filter(loan => loan.status === 'OVERDUE').length,
      pendingLoans: loans.filter(loan => loan.status === 'PENDING').length,
      totalLoanAmount: loans.reduce((sum, loan) => sum + loan.principalAmount, 0),
      totalPaid: transactions
        .filter(t => t.type === 'INTEREST_PAYMENT' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0),
      totalTransactions: transactions.length,
      totalGoldWeight: loans.reduce((sum, loan) => sum + (loan.goldWeight || 0), 0),
      totalGoldValue: loans.reduce((sum, loan) => sum + (loan.goldValue || 0), 0)
    };

    const dashboardData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        city: user.city,
        pincode: user.pincode,
        isActive: user.isActive,
        createdAt: user.createdAt,
        approvedAt: user.approvedAt
      },
      stats,
      loans,
      transactions
    };

    successResponse(res, 200, 'User dashboard data retrieved successfully', dashboardData);
  } catch (error) {
    console.error('Get user dashboard data error:', error);
    errorResponse(res, 500, 'Failed to retrieve user dashboard data', error);
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/statistics
// @access  Private/Admin
const getSystemStatistics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalLoans,
      totalTransactions,
      activeLoans,
      overdueLoans,
      completedLoans,
      pendingLoans,
      cancelledLoans
    ] = await Promise.all([
      User.countDocuments(),
      Loan.countDocuments(),
      Transaction.countDocuments(),
      Loan.countDocuments({ status: 'ACTIVE' }),
      Loan.countDocuments({ status: 'OVERDUE' }),
      Loan.countDocuments({ status: 'COMPLETED' }),
      Loan.countDocuments({ status: 'PENDING' }),
      Loan.countDocuments({ status: 'CANCELLED' })
    ]);

    // Calculate financial statistics
    const loans = await Loan.find();
    const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);
    
    const completedTransactions = await Transaction.find({ 
      type: 'INTEREST_PAYMENT', 
      status: 'COMPLETED' 
    });
    const totalInterestEarned = completedTransactions.reduce((sum, t) => sum + t.amount, 0);

    const statistics = {
      users: {
        total: totalUsers,
        pending: await User.countDocuments({ role: 'PENDING' }),
        active: await User.countDocuments({ isActive: true }),
        inactive: await User.countDocuments({ isActive: false })
      },
      loans: {
        total: totalLoans,
        active: activeLoans,
        overdue: overdueLoans,
        completed: completedLoans,
        pending: pendingLoans,
        cancelled: cancelledLoans
      },
      transactions: {
        total: totalTransactions,
        completed: await Transaction.countDocuments({ status: 'COMPLETED' }),
        pending: await Transaction.countDocuments({ status: 'PENDING' }),
        failed: await Transaction.countDocuments({ status: 'FAILED' })
      },
      financial: {
        totalLoanAmount,
        totalInterestEarned,
        averageLoanAmount: totalLoans > 0 ? totalLoanAmount / totalLoans : 0
      }
    };

    successResponse(res, 200, 'System statistics retrieved successfully', statistics);
  } catch (error) {
    console.error('Get system statistics error:', error);
    errorResponse(res, 500, 'Failed to retrieve system statistics', error);
  }
};

module.exports = {
  getDashboardData,
  getAllCustomers,
  getAllLoansWithFilters,
  getSystemSettings,
  updateSystemSettings,
  getAllRenewalRequests,
  updateRenewalStatus,
  getSystemStatistics,
  getUserDashboardData
};
