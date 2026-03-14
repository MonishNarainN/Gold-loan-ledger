const Razorpay = require('razorpay');
const crypto = require('crypto');
const Loan = require('../models/Loan');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const ensureRazorpayConfigured = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials are not configured');
  }
};

const createPaymentOrder = async (req, res) => {
  try {
    ensureRazorpayConfigured();

    const { loanId, amount, paymentType = 'INTEREST_PAYMENT' } = req.body;

    if (!loanId || !amount) {
      return errorResponse(res, 400, 'Loan ID and amount are required');
    }

    const loan = await Loan.findById(loanId).populate('userId', 'name email phone');
    if (!loan) {
      return errorResponse(res, 404, 'Loan not found');
    }

    const loanUserId =
      (loan.userId && typeof loan.userId === 'object' && 'id' in loan.userId)
        ? loan.userId.id
        : (loan.userId && typeof loan.userId === 'object' && '_id' in loan.userId)
          ? loan.userId._id.toString()
          : loan.userId?.toString();

    if (!loanUserId) {
      return errorResponse(res, 400, 'Loan is missing assigned user');
    }

    if (req.user.role !== 'ADMIN' && loanUserId !== req.user.id) {
      return errorResponse(res, 403, 'Access denied');
    }

    const loanUser =
      (loan.userId && typeof loan.userId === 'object' && ('name' in loan.userId || '_id' in loan.userId))
        ? loan.userId
        : await User.findById(loanUserId).select('name email phone');

    const amountInPaise = Math.round(Number(amount) * 100);
    if (amountInPaise <= 0) {
      return errorResponse(res, 400, 'Payment amount must be greater than zero');
    }

    const receipt = `loan_${loanId.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;

    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        loanId: loanId.toString(),
        userId: loan.userId._id.toString(),
        paymentType
      }
    });

    const transaction = await Transaction.create({
      loanId,
      userId: loanUserId,
      amount,
      type: paymentType,
      status: 'PENDING',
      paymentMethod: 'RAZORPAY',
      processedBy: req.user.id,
      paymentDetails: {
        gateway: 'RAZORPAY',
        orderId: order.id
      }
    });

    successResponse(res, 200, 'Payment order created', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      transactionId: transaction._id,
      customer: {
        name: loanUser?.name,
        email: loanUser?.email,
        phone: loanUser?.phone
      }
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    const errorMessage = error?.error?.description || error.message || 'Failed to create payment order';
    errorResponse(res, 500, errorMessage);
  }
};

const verifyPayment = async (req, res) => {
  try {
    ensureRazorpayConfigured();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transactionId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !transactionId) {
      return errorResponse(res, 400, 'Missing payment verification parameters');
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return errorResponse(res, 400, 'Invalid payment signature');
    }

    const transaction = await Transaction.findById(transactionId).populate('loanId');
    if (!transaction) {
      return errorResponse(res, 404, 'Transaction not found');
    }

    if (transaction.paymentDetails?.orderId !== razorpay_order_id) {
      return errorResponse(res, 400, 'Order ID mismatch');
    }

    transaction.status = 'COMPLETED';
    transaction.paymentMethod = 'RAZORPAY';
    transaction.paymentDetails = {
      ...(transaction.paymentDetails || {}),
      gateway: 'RAZORPAY',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    };
    transaction.processedAt = new Date();
    transaction.processedBy = req.user.id;
    await transaction.save();

    await Notification.create({
      userId: transaction.userId,
      title: 'Payment Successful',
      message: `Payment of ₹${transaction.amount.toLocaleString()} for loan ${transaction.loanId.loanNumber} is successful.`,
      type: 'SUCCESS',
      data: {
        transactionId: transaction._id,
        loanId: transaction.loanId._id,
        amount: transaction.amount
      }
    });

    successResponse(res, 200, 'Payment verified successfully', transaction);
  } catch (error) {
    console.error('Verify payment error:', error);
    errorResponse(res, 500, error.message || 'Failed to verify payment');
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment
};

