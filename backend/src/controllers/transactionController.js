const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
const getAllTransactions = async (req, res) => {
  try {
    let query = {};

    // Regular users can only see their own transactions
    if (req.user.role !== 'ADMIN') {
      query.userId = req.user.id;
    }

    const transactions = await Transaction.find(query)
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('userId', 'name email')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'Transactions retrieved successfully', transactions);
  } catch (error) {
    console.error('Get all transactions error:', error);
    errorResponse(res, 500, 'Failed to retrieve transactions', error);
  }
};

// @desc    Get transactions by loan ID
// @route   GET /api/transactions/loan/:loanId
// @access  Private
const getLoanTransactions = async (req, res) => {
  try {
    const loanId = req.params.loanId;

    // Check if loan exists and user has access
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return errorResponse(res, 404, 'Loan not found');
    }

    // Users can only see transactions for their own loans unless they're admin
    if (req.user.role !== 'ADMIN' && loan.userId.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    const transactions = await Transaction.find({ loanId })
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('userId', 'name email')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'Loan transactions retrieved successfully', transactions);
  } catch (error) {
    console.error('Get loan transactions error:', error);
    errorResponse(res, 500, 'Failed to retrieve loan transactions', error);
  }
};

// @desc    Get transactions by user ID
// @route   GET /api/transactions/user/:userId
// @access  Private
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Users can only see their own transactions unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    const transactions = await Transaction.find({ userId })
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('userId', 'name email')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'User transactions retrieved successfully', transactions);
  } catch (error) {
    console.error('Get user transactions error:', error);
    errorResponse(res, 500, 'Failed to retrieve user transactions', error);
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const transactionData = req.body;

    // Check if loan exists and user has access
    const loan = await Loan.findById(transactionData.loanId);
    if (!loan) {
      return errorResponse(res, 404, 'Loan not found');
    }

    // Users can only create transactions for their own loans unless they're admin
    if (req.user.role !== 'ADMIN' && loan.userId.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    // Set processed by
    transactionData.processedBy = req.user.id;
    transactionData.processedAt = new Date();

    const transaction = await Transaction.create(transactionData);

    // Populate the created transaction
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('userId', 'name email')
      .populate('processedBy', 'name');

    // Create notification
    await Notification.create({
      userId: transaction.userId,
      title: 'Transaction Created',
      message: `A ${transaction.type.replace('_', ' ').toLowerCase()} of ₹${transaction.amount} has been processed.`,
      type: 'SUCCESS',
      data: { 
        transactionId: transaction._id, 
        loanId: transaction.loanId,
        amount: transaction.amount,
        type: transaction.type
      }
    });

    successResponse(res, 201, 'Transaction created successfully', populatedTransaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    errorResponse(res, 500, 'Failed to create transaction', error);
  }
};

// @desc    Update transaction status
// @route   PUT /api/transactions/:id/status
// @access  Private/Admin
const updateTransactionStatus = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { status } = req.body;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return errorResponse(res, 404, 'Transaction not found');
    }

    transaction.status = status;
    if (status === 'COMPLETED' && !transaction.processedAt) {
      transaction.processedAt = new Date();
    }

    await transaction.save();

    // Populate the updated transaction
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('userId', 'name email')
      .populate('processedBy', 'name');

    // Create notification
    await Notification.create({
      userId: transaction.userId,
      title: 'Transaction Status Updated',
      message: `Your transaction status has been updated to ${status}.`,
      type: 'INFO',
      data: { 
        transactionId: transaction._id,
        status,
        amount: transaction.amount,
        type: transaction.type
      }
    });

    successResponse(res, 200, 'Transaction status updated successfully', populatedTransaction);
  } catch (error) {
    console.error('Update transaction status error:', error);
    errorResponse(res, 500, 'Failed to update transaction status', error);
  }
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const transaction = await Transaction.findById(transactionId)
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('userId', 'name email')
      .populate('processedBy', 'name');

    if (!transaction) {
      return errorResponse(res, 404, 'Transaction not found');
    }

    // Users can only see their own transactions unless they're admin
    if (req.user.role !== 'ADMIN' && transaction.userId._id.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    successResponse(res, 200, 'Transaction retrieved successfully', transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    errorResponse(res, 500, 'Failed to retrieve transaction', error);
  }
};

module.exports = {
  getAllTransactions,
  getLoanTransactions,
  getUserTransactions,
  createTransaction,
  updateTransactionStatus,
  getTransaction
};
