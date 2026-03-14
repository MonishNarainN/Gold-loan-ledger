const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: [true, 'Loan ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Transaction amount is required'],
    min: [0.01, 'Minimum transaction amount is ₹0.01']
  },
  type: {
    type: String,
    enum: [
      'LOAN_DISBURSEMENT',
      'INTEREST_PAYMENT',
      'PRINCIPAL_PAYMENT',
      'PENALTY',
      'PROCESSING_FEE',
      'RENEWAL_FEE'
    ],
    required: [true, 'Transaction type is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'OTHER', 'RAZORPAY'],
    default: 'CASH'
  },
  paymentDetails: {
    cardLast4: String,
    upiId: String,
    bankName: String,
    chequeNumber: String,
    gateway: String,
    orderId: String,
    paymentId: String
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Auto-generate reference number
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.reference) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.reference = `TXN${timestamp}${random}`;
  }
  next();
});

// Index for better query performance
transactionSchema.index({ loanId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ reference: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
