const express = require('express');
const {
  getDashboardData,
  getAllCustomers,
  getAllLoansWithFilters,
  getSystemSettings,
  updateSystemSettings,
  getAllRenewalRequests,
  updateRenewalStatus,
  getSystemStatistics,
  getUserDashboardData
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and admin only
router.use(protect);
router.use(authorize('ADMIN'));

// Admin routes
router.get('/dashboard', getDashboardData);
router.get('/customers', getAllCustomers);
router.get('/users/:userId/dashboard', getUserDashboardData); // Must come before /loans to avoid route conflict
router.get('/loans', getAllLoansWithFilters);
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.get('/renewals', getAllRenewalRequests);
router.put('/renewals/:id/status', updateRenewalStatus);
router.get('/statistics', getSystemStatistics);

module.exports = router;
