// Calculate loan interest based on principal, rate, and days
const calculateInterest = (principal, rate, days) => {
  return (principal * rate / 100) * (days / 365);
};

// Calculate total repayment amount
const calculateTotalRepayment = (principal, interest) => {
  return principal + interest;
};

// Calculate gold value
const calculateGoldValue = (weight, purity, rate) => {
  return (weight * purity / 100) * rate;
};

// Calculate penalty for overdue loans
const calculatePenalty = (principal, penaltyRate, overdueDays) => {
  return (principal * penaltyRate / 100) * (overdueDays / 365);
};

// Calculate processing fee
const calculateProcessingFee = (principal, feeRate) => {
  return principal * feeRate / 100;
};

// Calculate renewal fee
const calculateRenewalFee = (principal, feeRate) => {
  return principal * feeRate / 100;
};

// Calculate loan-to-value ratio
const calculateLTV = (loanAmount, goldValue) => {
  if (goldValue === 0) return 0;
  return (loanAmount / goldValue) * 100;
};

// Check if loan is overdue
const isLoanOverdue = (dueDate) => {
  return new Date() > new Date(dueDate);
};

// Calculate days until due
const getDaysUntilDue = (dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Calculate overdue days
const getOverdueDays = (dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today - due;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Generate loan number
const generateLoanNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GL${timestamp}${random}`;
};

// Calculate EMI (if needed for future features)
const calculateEMI = (principal, rate, months) => {
  const monthlyRate = rate / 12 / 100;
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / 
              (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(emi);
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Validate gold loan data
const validateGoldLoanData = (data) => {
  const errors = [];

  // Check required fields
  if (!data.principalAmount || data.principalAmount <= 0) {
    errors.push('Principal amount is required and must be greater than 0');
  }

  if (!data.interestRate || data.interestRate <= 0) {
    errors.push('Interest rate is required and must be greater than 0');
  }

  if (!data.termDays || data.termDays <= 0) {
    errors.push('Loan term is required and must be greater than 0');
  }

  if (!data.customer || data.customer.trim() === '') {
    errors.push('Customer name is required');
  }

  if (!data.userId) {
    errors.push('User ID is required');
  }

  // Gold-specific validations
  if (data.goldWeight && data.goldPurity && data.goldRate) {
    const goldValue = calculateGoldValue(data.goldWeight, data.goldPurity, data.goldRate);
    const ltv = calculateLTV(data.principalAmount, goldValue);
    
    if (ltv > 80) {
      errors.push(`Loan amount (₹${data.principalAmount.toLocaleString()}) cannot exceed 80% of gold value (₹${goldValue.toLocaleString()}). Maximum allowed: ₹${(goldValue * 0.8).toLocaleString()}`);
    }
  }

  if (data.termDays > 365) {
    errors.push('Loan term cannot exceed 365 days');
  }

  if (data.interestRate > 30) {
    errors.push('Interest rate seems too high. Please verify.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  calculateInterest,
  calculateTotalRepayment,
  calculateGoldValue,
  calculatePenalty,
  calculateProcessingFee,
  calculateRenewalFee,
  calculateLTV,
  isLoanOverdue,
  getDaysUntilDue,
  getOverdueDays,
  generateLoanNumber,
  calculateEMI,
  formatCurrency,
  validateGoldLoanData
};
