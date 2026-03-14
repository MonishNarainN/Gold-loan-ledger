const express = require('express');
const {
  getAllLoans,
  getUserLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  updateLoanStatus,
  checkOverdueLoans
} = require('../controllers/loanController');
const { protect, authorize, requireApproval } = require('../middleware/auth');

const router = express.Router();

// Protect all loan routes
router.use(protect);

// Create new loan (requires approved account)
router.post('/', requireApproval, createLoan);

// Get all loans (admins see all, users only their own handled in controller)
router.get('/', getAllLoans);

// Get loans by user
router.get('/user/:userId', getUserLoans);

// Check overdue loans (admin only)
router.put('/check-overdue', authorize('ADMIN'), checkOverdueLoans);

// Get single loan
router.get('/:id', getLoan);

// Update loan (admin only)
router.put('/:id', authorize('ADMIN'), updateLoan);

// Delete loan (admin only)
router.delete('/:id', authorize('ADMIN'), deleteLoan);

// Update loan status (admin only)
router.put('/:id/status', authorize('ADMIN'), updateLoanStatus);

module.exports = router;
