const RenewalRequest = require('../models/RenewalRequest');
const Loan = require('../models/Loan');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');
const { calculateInterest, calculateTotalRepayment } = require('../utils/loanCalculations');

// @desc    Get all renewal requests
// @route   GET /api/renewals
// @access  Private
const getAllRenewalRequests = async (req, res) => {
  try {
    let query = {};

    // Regular users can only see their own renewal requests
    if (req.user.role !== 'ADMIN') {
      query.userId = req.user.id;
    }

    const renewals = await RenewalRequest.find(query)
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

// @desc    Get renewal requests by user ID
// @route   GET /api/renewals/user/:userId
// @access  Private
const getUserRenewalRequests = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Users can only see their own renewal requests unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return errorResponse(res, 403, 'Access denied');
    }

    const renewals = await RenewalRequest.find({ userId })
      .populate('userId', 'name email phone')
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    successResponse(res, 200, 'User renewal requests retrieved successfully', renewals);
  } catch (error) {
    console.error('Get user renewal requests error:', error);
    errorResponse(res, 500, 'Failed to retrieve user renewal requests', error);
  }
};

// @desc    Create renewal request
// @route   POST /api/renewals
// @access  Private
const createRenewalRequest = async (req, res) => {
  try {
    const renewalData = req.body;

    // Check if loan exists and user has access
    const loan = await Loan.findById(renewalData.loanId);
    if (!loan) {
      return errorResponse(res, 404, 'Loan not found');
    }

    // Users can only create renewal requests for their own loans unless they're admin
    if (req.user.role !== 'ADMIN' && loan.userId.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    // Check if loan is eligible for renewal
    if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') {
      return errorResponse(res, 400, 'Only active or overdue loans can be renewed');
    }

    // Check if there's already a pending renewal request for this loan
    const existingRenewal = await RenewalRequest.findOne({
      loanId: renewalData.loanId,
      status: 'PENDING'
    });

    if (existingRenewal) {
      return errorResponse(res, 400, 'A pending renewal request already exists for this loan');
    }

    // Calculate renewal details
    const currentDate = new Date();
    const loanStartDate = new Date(loan.startDate);
    const daysElapsed = Math.ceil((currentDate - loanStartDate) / (1000 * 60 * 60 * 24));
    
    const interestAccrued = calculateInterest(
      loan.principalAmount,
      loan.interestRate,
      daysElapsed
    );

    const additionalInterest = calculateInterest(
      loan.principalAmount,
      loan.interestRate,
      renewalData.requestedExtensionDays
    );

    const processingFee = loan.principalAmount * 0.01; // 1% processing fee
    const totalPayable = loan.principalAmount + interestAccrued + additionalInterest + processingFee;

    // Set renewal data
    renewalData.userId = loan.userId;
    renewalData.currentStatus = loan.status;
    renewalData.originalAmount = loan.principalAmount;
    renewalData.originalDueDate = loan.dueDate;
    renewalData.interestAccrued = interestAccrued;
    renewalData.additionalInterest = additionalInterest;
    renewalData.processingFee = processingFee;
    renewalData.totalPayable = totalPayable;

    const renewal = await RenewalRequest.create(renewalData);

    // Populate the created renewal
    const populatedRenewal = await RenewalRequest.findById(renewal._id)
      .populate('userId', 'name email phone')
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('processedBy', 'name');

    // Create notification for user
    await Notification.create({
      userId: loan.userId,
      title: 'Renewal Request Created',
      message: `Your renewal request for loan ${loan.loanNumber} has been submitted and is pending approval.`,
      type: 'INFO',
      data: { 
        renewalId: renewal._id,
        loanId: loan._id,
        loanNumber: loan.loanNumber
      }
    });

    // Create notification for admin
    const admin = await require('../models/User').findOne({ role: 'ADMIN' });
    if (admin) {
      await Notification.create({
        userId: admin._id,
        title: 'New Renewal Request',
        message: `A renewal request for loan ${loan.loanNumber} has been submitted and needs approval.`,
        type: 'APPROVAL',
        data: { 
          renewalId: renewal._id,
          loanId: loan._id,
          loanNumber: loan.loanNumber
        }
      });
    }

    successResponse(res, 201, 'Renewal request created successfully', populatedRenewal);
  } catch (error) {
    console.error('Create renewal request error:', error);
    errorResponse(res, 500, 'Failed to create renewal request', error);
  }
};

// @desc    Get renewal request by ID
// @route   GET /api/renewals/:id
// @access  Private
const getRenewalRequest = async (req, res) => {
  try {
    const renewalId = req.params.id;

    const renewal = await RenewalRequest.findById(renewalId)
      .populate('userId', 'name email phone')
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('processedBy', 'name');

    if (!renewal) {
      return errorResponse(res, 404, 'Renewal request not found');
    }

    // Users can only see their own renewal requests unless they're admin
    if (req.user.role !== 'ADMIN' && renewal.userId._id.toString() !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    successResponse(res, 200, 'Renewal request retrieved successfully', renewal);
  } catch (error) {
    console.error('Get renewal request error:', error);
    errorResponse(res, 500, 'Failed to retrieve renewal request', error);
  }
};

// @desc    Update renewal request status (Admin only)
// @route   PUT /api/renewals/:id/status
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
      
      // Update loan with new due date
      const loan = await Loan.findById(renewal.loanId._id);
      if (loan) {
        const newDueDate = new Date(loan.dueDate);
        newDueDate.setDate(newDueDate.getDate() + renewal.requestedExtensionDays);
        loan.dueDate = newDueDate;
        loan.status = 'ACTIVE'; // Ensure loan is active after renewal
        await loan.save();
      }
    } else if (status === 'REJECTED') {
      renewal.rejectionReason = comments;
    }

    await renewal.save();

    // Populate the updated renewal
    const populatedRenewal = await RenewalRequest.findById(renewal._id)
      .populate('userId', 'name email phone')
      .populate('loanId', 'loanNumber customer principalAmount')
      .populate('processedBy', 'name');

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

    successResponse(res, 200, `Renewal request ${status.toLowerCase()} successfully`, populatedRenewal);
  } catch (error) {
    console.error('Update renewal status error:', error);
    errorResponse(res, 500, 'Failed to update renewal status', error);
  }
};

module.exports = {
  getAllRenewalRequests,
  getUserRenewalRequests,
  createRenewalRequest,
  getRenewalRequest,
  updateRenewalStatus
};
