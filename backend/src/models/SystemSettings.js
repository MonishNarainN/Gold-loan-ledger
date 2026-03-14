const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  defaultInterestRate: {
    type: Number,
    required: true,
    min: [1, 'Minimum interest rate is 1%'],
    max: [50, 'Maximum interest rate is 50%'],
    default: 12
  },
  currentGoldRate: {
    type: Number,
    required: true,
    min: [1000, 'Minimum gold rate is ₹1,000 per gram'],
    default: 6500
  },
  maxLoanAmount: {
    type: Number,
    required: true,
    min: [1000, 'Minimum loan amount is ₹1,000'],
    default: 1000000
  },
  minLoanAmount: {
    type: Number,
    required: true,
    min: [1000, 'Minimum loan amount is ₹1,000'],
    default: 10000
  },
  defaultLoanDuration: {
    type: Number,
    required: true,
    min: [1, 'Minimum loan duration is 1 day'],
    max: [365, 'Maximum loan duration is 365 days'],
    default: 30
  },
  autoApprovalLimit: {
    type: Number,
    required: true,
    min: [0, 'Auto approval limit cannot be negative'],
    default: 50000
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    default: 'GoldFlow Pro'
  },
  companyEmail: {
    type: String,
    required: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    default: 'admin@goldflow.com'
  },
  companyPhone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number'],
    default: '9876543210'
  },
  businessHours: {
    type: String,
    required: true,
    trim: true,
    default: '9:00 AM - 6:00 PM (Mon-Sat)'
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: true
  },
  overdueReminders: {
    type: Boolean,
    default: true
  },
  approvalAlerts: {
    type: Boolean,
    default: true
  },
  penaltyRate: {
    type: Number,
    min: [0, 'Penalty rate cannot be negative'],
    max: [10, 'Maximum penalty rate is 10%'],
    default: 2
  },
  processingFeeRate: {
    type: Number,
    min: [0, 'Processing fee rate cannot be negative'],
    max: [5, 'Maximum processing fee rate is 5%'],
    default: 1
  },
  renewalFeeRate: {
    type: Number,
    min: [0, 'Renewal fee rate cannot be negative'],
    max: [3, 'Maximum renewal fee rate is 3%'],
    default: 0.5
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
