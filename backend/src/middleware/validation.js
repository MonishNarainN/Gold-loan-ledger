const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  
  body('pincode')
    .optional({ checkFalsy: true })
    .matches(/^\d{6}$/)
    .withMessage('Please provide a valid 6-digit pincode'),
  
  body('aadharNumber')
    .optional()
    .matches(/^\d{12}$/)
    .withMessage('Please provide a valid 12-digit Aadhar number'),
  
  body('panNumber')
    .optional()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Please provide a valid PAN number'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Loan creation validation
const validateLoanCreation = [
  body('customer')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ max: 100 })
    .withMessage('Customer name cannot exceed 100 characters'),
  
  body('principalAmount')
    .isNumeric()
    .withMessage('Principal amount must be a number')
    .isFloat({ min: 1000, max: 10000000 })
    .withMessage('Principal amount must be between ₹1,000 and ₹1,00,00,000'),
  
  body('interestRate')
    .isNumeric()
    .withMessage('Interest rate must be a number')
    .isFloat({ min: 1, max: 50 })
    .withMessage('Interest rate must be between 1% and 50%'),
  
  body('termDays')
    .isInt({ min: 1, max: 365 })
    .withMessage('Loan term must be between 1 and 365 days'),
  
  body('goldWeight')
    .optional()
    .isNumeric()
    .withMessage('Gold weight must be a number')
    .isFloat({ min: 0.1 })
    .withMessage('Minimum gold weight is 0.1 grams'),
  
  body('goldPurity')
    .optional()
    .isNumeric()
    .withMessage('Gold purity must be a number')
    .isFloat({ min: 1, max: 100 })
    .withMessage('Gold purity must be between 1% and 100%'),
  
  body('goldRate')
    .optional()
    .isNumeric()
    .withMessage('Gold rate must be a number')
    .isFloat({ min: 1000 })
    .withMessage('Minimum gold rate is ₹1,000 per gram'),
  
  body('collateral')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Collateral description cannot exceed 500 characters'),
  
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters'),
  
  handleValidationErrors
];

// Transaction creation validation
const validateTransactionCreation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be at least ₹0.01'),
  
  body('type')
    .isIn(['LOAN_DISBURSEMENT', 'INTEREST_PAYMENT', 'PRINCIPAL_PAYMENT', 'PENALTY', 'PROCESSING_FEE', 'RENEWAL_FEE'])
    .withMessage('Invalid transaction type'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('paymentMethod')
    .optional()
    .isIn(['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'OTHER'])
    .withMessage('Invalid payment method'),
  
  handleValidationErrors
];

// Renewal request validation
const validateRenewalRequest = [
  body('requestType')
    .isIn(['EXTENSION', 'RENEWAL', 'PARTIAL_PAYMENT'])
    .withMessage('Invalid request type'),
  
  body('requestedExtensionDays')
    .isInt({ min: 1, max: 90 })
    .withMessage('Extension days must be between 1 and 90'),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateLoanCreation,
  validateTransactionCreation,
  validateRenewalRequest
};
