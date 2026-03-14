const Loan = require('../models/Loan');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');
const { 
  calculateInterest, 
  calculateTotalRepayment, 
  calculateGoldValue,
  isLoanOverdue,
  getOverdueDays,
  validateGoldLoanData
} = require('../utils/loanCalculations');
const { sendEmail, isEmailConfigured } = require('../utils/emailService');

// @desc    Get all loans
// @route   GET /api/loans
// @access  Private
const getAllLoans = async (req, res) => {
  try {

    let query = {};

    // Regular users can only see their own loans
    if (req.user.role !== 'ADMIN') {
      query.userId = req.user.id;
    }

    const loans = await Loan.find(query)
      .populate('userId', 'name email phone')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'Loans retrieved successfully', loans);
  } catch (error) {
    console.error('Get all loans error:', error);
    errorResponse(res, 500, 'Failed to retrieve loans', error);
  }
};

// @desc    Get loans by user ID
// @route   GET /api/loans/user/:userId
// @access  Private
const getUserLoans = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Users can only see their own loans unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    const loans = await Loan.find({ userId })
      .populate('userId', 'name email phone')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'User loans retrieved successfully', loans);
  } catch (error) {
    console.error('Get user loans error:', error);
    errorResponse(res, 500, 'Failed to retrieve user loans', error);
  }
};

// @desc    Get loan by ID
// @route   GET /api/loans/:id
// @access  Private
const getLoan = async (req, res) => {
  try {
    const loanId = req.params.id;

    const loan = await Loan.findById(loanId)
      .populate('userId', 'name email phone')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    if (!loan) {
      return errorResponse(res, 404, 'Loan not found');
    }

    // Users can only see their own loans unless they're admin
    if (req.user.role !== 'ADMIN' && loan.userId._id.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    successResponse(res, 200, 'Loan retrieved successfully', loan);
  } catch (error) {
    console.error('Get loan error:', error);
    errorResponse(res, 500, 'Failed to retrieve loan', error);
  }
};

// @desc    Create new loan
// @route   POST /api/loans
// @access  Private
const createLoan = async (req, res) => {
  try {
    const loanData = req.body;

    // Validate gold loan data
    const validation = validateGoldLoanData(loanData);
    if (!validation.isValid) {
      return validationErrorResponse(res, validation.errors);
    }

    // Set created by
    loanData.createdBy = req.user.id;

    // Set dates
    loanData.startDate = new Date();
    loanData.dueDate = new Date(Date.now() + (loanData.termDays * 24 * 60 * 60 * 1000));

    // Generate loan number
    loanData.loanNumber = `GL${Date.now().toString().slice(-6)}`;

    // Calculate additional values
    if (loanData.goldWeight && loanData.goldPurity && loanData.goldRate) {
      loanData.goldValue = calculateGoldValue(
        loanData.goldWeight, 
        loanData.goldPurity, 
        loanData.goldRate
      );
    }

    loanData.interestAmount = calculateInterest(
      loanData.principalAmount, 
      loanData.interestRate, 
      loanData.termDays
    );

    loanData.totalRepayment = calculateTotalRepayment(
      loanData.principalAmount, 
      loanData.interestAmount
    );

    const loan = await Loan.create(loanData);

    // Populate the created loan
    const populatedLoan = await Loan.findById(loan._id)
      .populate('userId', 'name email phone')
      .populate('createdBy', 'name');

    // Create notification for user
    await Notification.create({
      userId: loan.userId,
      title: 'New Loan Created',
      message: `Your loan ${loan.loanNumber} has been created and is pending approval.`,
      type: 'INFO',
      data: { loanId: loan._id, loanNumber: loan.loanNumber }
    });

    // Create notification for admin
    const admin = await require('../models/User').findOne({ role: 'ADMIN' });
    if (admin) {
      await Notification.create({
        userId: admin._id,
        title: 'New Loan Created',
        message: `A new loan ${loan.loanNumber} has been created and needs approval.`,
        type: 'APPROVAL',
        data: { loanId: loan._id, loanNumber: loan.loanNumber }
      });
    }

    successResponse(res, 201, 'Loan created successfully', populatedLoan);
  } catch (error) {
    console.error('Create loan error:', error);
    errorResponse(res, 500, 'Failed to create loan', error);
  }
};

// @desc    Update loan
// @route   PUT /api/loans/:id
// @access  Private
const updateLoan = async (req, res) => {
  try {
    const loanId = req.params.id;
    const updateData = req.body;

    const loan = await Loan.findById(loanId);

    if (!loan) {
      return errorResponse(res, 404, 'Loan not found');
    }

    // Only admin can update loans
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Access denied');
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.loanNumber;
    delete updateData.createdBy;

    // Handle user reassignment if provided
    if (updateData.userId && updateData.userId !== loan.userId.toString()) {
      const newUser = await User.findById(updateData.userId);
      if (!newUser) {
        return errorResponse(res, 400, 'Selected user not found');
      }
      loan.userId = updateData.userId;
      // If customer name not explicitly provided, sync with user's name
      if (!updateData.customer && newUser.name) {
        loan.customer = newUser.name;
      }
    }
    delete updateData.userId;

    // Apply remaining updates to the loan document
    Object.assign(loan, updateData);
    await loan.save();

    const updatedLoan = await Loan.findById(loanId)
      .populate('userId', 'name email phone')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    // Create notification
    await Notification.create({
      userId: loan.userId,
      title: 'Loan Updated',
      message: `Your loan ${loan.loanNumber} has been updated.`,
      type: 'INFO',
      data: { loanId: loan._id, loanNumber: loan.loanNumber }
    });

    successResponse(res, 200, 'Loan updated successfully', updatedLoan);
  } catch (error) {
    console.error('Update loan error:', error);
    errorResponse(res, 500, 'Failed to update loan', error);
  }
};

// @desc    Delete loan
// @route   DELETE /api/loans/:id
// @access  Private/Admin
const deleteLoan = async (req, res) => {
  try {
    const loanId = req.params.id;

    const loan = await Loan.findById(loanId);

    if (!loan) {
      return errorResponse(res, 404, 'Loan not found');
    }

    // Check if loan has transactions
    const transactions = await Transaction.find({ loanId });
    if (transactions.length > 0) {
      return errorResponse(res, 400, 'Cannot delete loan with existing transactions');
    }

    await Loan.findByIdAndDelete(loanId);

    // Create notification
    await Notification.create({
      userId: loan.userId,
      title: 'Loan Deleted',
      message: `Your loan ${loan.loanNumber} has been deleted.`,
      type: 'WARNING',
      data: { loanId: loan._id, loanNumber: loan.loanNumber }
    });

    successResponse(res, 200, 'Loan deleted successfully');
  } catch (error) {
    console.error('Delete loan error:', error);
    errorResponse(res, 500, 'Failed to delete loan', error);
  }
};

// @desc    Update loan status
// @route   PUT /api/loans/:id/status
// @access  Private/Admin
const updateLoanStatus = async (req, res) => {
  try {
    const loanId = req.params.id;
    const { status } = req.body;

    const loan = await Loan.findById(loanId);

    if (!loan) {
      return errorResponse(res, 404, 'Loan not found');
    }

    loan.status = status;
    
    if (status === 'ACTIVE' && !loan.approvedAt) {
      loan.approvedAt = new Date();
      loan.approvedBy = req.user.id;
    }

    await loan.save();

    // Populate the updated loan
    const populatedLoan = await Loan.findById(loan._id)
      .populate('userId', 'name email phone')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    // Create notification
    await Notification.create({
      userId: loan.userId,
      title: 'Loan Status Updated',
      message: `Your loan ${loan.loanNumber} status has been updated to ${status}.`,
      type: 'INFO',
      data: { loanId: loan._id, loanNumber: loan.loanNumber, status }
    });

    successResponse(res, 200, 'Loan status updated successfully', populatedLoan);
  } catch (error) {
    console.error('Update loan status error:', error);
    errorResponse(res, 500, 'Failed to update loan status', error);
  }
};

// @desc    Check and update overdue loans
// @route   PUT /api/loans/check-overdue
// @access  Private/Admin
const checkOverdueLoans = async (req, res) => {
  try {
    const activeLoans = await Loan.find({ status: { $in: ['ACTIVE', 'PENDING'] } }).populate('userId', 'name email');
    let updatedCount = 0;
    let emailSentCount = 0;

    for (const loan of activeLoans) {
      if (isLoanOverdue(loan.dueDate)) {
        loan.status = 'OVERDUE';
        await loan.save();
        updatedCount++;

        // Create notification
        await Notification.create({
          userId: loan.userId,
          title: 'Loan Overdue',
          message: `Your loan ${loan.loanNumber} is now overdue. Please make payment immediately.`,
          type: 'ERROR',
          data: { loanId: loan._id, loanNumber: loan.loanNumber }
        });

        if (loan.userId && loan.userId.email) {
          const overdueDays = getOverdueDays(loan.dueDate);
          const subject = `Loan ${loan.loanNumber} is overdue`;
          const text = `Dear ${loan.userId.name || 'Customer'},\n\nYour loan ${loan.loanNumber} became overdue on ${new Date(loan.dueDate).toLocaleDateString()}. It has been overdue for ${overdueDays} day(s). Please log in to your dashboard and make a payment immediately to avoid penalties.\n\nThank you,\nGoldFlow Team`;
          const html = `
            <p>Dear ${loan.userId.name || 'Customer'},</p>
            <p>Your loan <strong>${loan.loanNumber}</strong> was due on <strong>${new Date(loan.dueDate).toLocaleDateString()}</strong> and is now overdue by <strong>${overdueDays} day(s)</strong>.</p>
            <p>Please log in to your dashboard and make a payment immediately to avoid additional penalties.</p>
            <p>Thank you,<br/>GoldFlow Team</p>
          `;
          const sent = await sendEmail({ to: loan.userId.email, subject, text, html });
          if (sent) {
            emailSentCount++;
          }
        }
      }
    }

    successResponse(res, 200, `Checked ${activeLoans.length} loans, ${updatedCount} marked as overdue, ${emailSentCount} emails sent`);
  } catch (error) {
    console.error('Check overdue loans error:', error);
    errorResponse(res, 500, 'Failed to check overdue loans', error);
  }
};

module.exports = {
  getAllLoans,
  getUserLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  updateLoanStatus,
  checkOverdueLoans
};
