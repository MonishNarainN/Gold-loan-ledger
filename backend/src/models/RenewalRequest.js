const mongoose = require('mongoose');

const renewalRequestSchema = new mongoose.Schema({
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
  requestType: {
    type: String,
    enum: ['EXTENSION', 'RENEWAL', 'PARTIAL_PAYMENT'],
    required: [true, 'Request type is required']
  },
  requestedExtensionDays: {
    type: Number,
    required: [true, 'Requested extension days is required'],
    min: [1, 'Minimum extension is 1 day'],
    max: [90, 'Maximum extension is 90 days']
  },
  reason: {
    type: String,
    required: [true, 'Reason for renewal is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  currentStatus: {
    type: String,
    required: true
  },
  originalAmount: {
    type: Number,
    required: true
  },
  originalDueDate: {
    type: Date,
    required: true
  },
  interestAccrued: {
    type: Number,
    default: 0
  },
  additionalInterest: {
    type: Number,
    default: 0
  },
  processingFee: {
    type: Number,
    default: 0
  },
  totalPayable: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [500, 'Comments cannot exceed 500 characters']
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Calculate total payable before saving
renewalRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    this.totalPayable = this.originalAmount + this.interestAccrued + this.additionalInterest + this.processingFee;
  }
  next();
});

// Index for better query performance
renewalRequestSchema.index({ userId: 1, status: 1 });
renewalRequestSchema.index({ loanId: 1 });
renewalRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('RenewalRequest', renewalRequestSchema);
