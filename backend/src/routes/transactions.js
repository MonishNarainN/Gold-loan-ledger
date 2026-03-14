const express = require('express');
const {
  getAllTransactions,
  getLoanTransactions,
  getUserTransactions,
  createTransaction,
  updateTransactionStatus,
  getTransaction
} = require('../controllers/transactionController');
const { protect, authorize, requireApproval } = require('../middleware/auth');
const { validateTransactionCreation } = require('../middleware/validation');

const router = express.Router();

// All routes are protected and require approval
router.use(protect);
router.use(requireApproval);

// Transaction routes
router.get('/', getAllTransactions);
router.get('/loan/:loanId', getLoanTransactions);
router.get('/user/:userId', getUserTransactions);
router.get('/:id', getTransaction);
router.post('/', validateTransactionCreation, createTransaction);
router.put('/:id/status', authorize('ADMIN'), updateTransactionStatus);

module.exports = router;
