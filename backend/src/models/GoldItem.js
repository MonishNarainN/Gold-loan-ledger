const mongoose = require('mongoose');

const goldItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    required: true,
    enum: ['Jewelry', 'Coins', 'Bars', 'Other'],
    default: 'Jewelry'
  },
  weight: {
    type: Number,
    required: true,
    min: 0.1
  },
  purity: {
    type: Number,
    required: true,
    min: 0,
    max: 999.99
  },
  description: String,
  marketValue: {
    type: Number,
    required: true
  },
  loanAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['IN_STOCK', 'LOANED', 'SOLD', 'RETURNED'],
    default: 'IN_STOCK'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan'
  },
  images: [String],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update `updatedAt` before saving
goldItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('GoldItem', goldItemSchema);
