const express = require('express');
const {
  getAllRenewalRequests,
  getUserRenewalRequests,
  createRenewalRequest,
  getRenewalRequest,
  updateRenewalStatus
} = require('../controllers/renewalController');
const { protect, authorize, requireApproval } = require('../middleware/auth');
const { validateRenewalRequest } = require('../middleware/validation');

const router = express.Router();

// All routes are protected and require approval
router.use(protect);
router.use(requireApproval);

// Renewal routes
router.get('/', getAllRenewalRequests);
router.get('/user/:userId', getUserRenewalRequests);
router.get('/:id', getRenewalRequest);
router.post('/', validateRenewalRequest, createRenewalRequest);
router.put('/:id/status', authorize('ADMIN'), updateRenewalStatus);

module.exports = router;
