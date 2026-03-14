const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  loanNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  customer: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  principalAmount: {
    type: Number,
    required: [true, 'Principal amount is required'],
    min: [1000, 'Minimum loan amount is ₹1,000'],
    max: [10000000, 'Maximum loan amount is ₹1,00,00,000']
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [1, 'Minimum interest rate is 1%'],
    max: [50, 'Maximum interest rate is 50%']
  },
  termDays: {
    type: Number,
    required: [true, 'Loan term is required'],
    min: [1, 'Minimum loan term is 1 day'],
    max: [365, 'Maximum loan term is 365 days']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'OVERDUE', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  collateral: {
    type: String,
    trim: true,
    maxlength: [500, 'Collateral description cannot exceed 500 characters']
  },
  goldWeight: {
    type: Number,
    min: [0.1, 'Minimum gold weight is 0.1 grams']
  },
  goldPurity: {
    type: Number,
    min: [1, 'Minimum gold purity is 1%'],
    max: [100, 'Maximum gold purity is 100%']
  },
  goldRate: {
    type: Number,
    min: [1000, 'Minimum gold rate is ₹1,000 per gram']
  },
  goldValue: {
    type: Number,
    min: [0, 'Gold value cannot be negative']
  },
  interestAmount: {
    type: Number,
    min: [0, 'Interest amount cannot be negative']
  },
  totalRepayment: {
    type: Number,
    min: [0, 'Total repayment cannot be negative']
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comments cannot exceed 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, { timestamps: true });

// Generate loan number before saving
loanSchema.pre('save', function (next) {
  if (this.isNew && !this.loanNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.loanNumber = `GL${timestamp}${random}`;
  }
  next();
});

// Calculate due date before saving
loanSchema.pre('save', function (next) {
  if (this.isNew && this.startDate && this.termDays) {
    const dueDate = new Date(this.startDate);
    dueDate.setDate(dueDate.getDate() + this.termDays);
    this.dueDate = dueDate;
  }
  next();
});

// Calculate loan values before saving
loanSchema.pre('save', function (next) {
  if (this.goldWeight && this.goldPurity && this.goldRate) {
    this.goldValue = (this.goldWeight * this.goldPurity / 100) * this.goldRate;
  }

  if (this.principalAmount && this.interestRate && this.termDays) {
    this.interestAmount = (this.principalAmount * this.interestRate / 100) * (this.termDays / 365);
    this.totalRepayment = this.principalAmount + this.interestAmount;
  }

  next();
});

// Indexes for faster search
loanSchema.index({ userId: 1, status: 1 });
// loanNumber index is already created by unique: true, so we don't need to add it again
loanSchema.index({ dueDate: 1 });
loanSchema.index({ status: 1 });

module.exports = mongoose.models.Loan || mongoose.model('Loan', loanSchema);