const express = require('express');
const router = express.Router();
const { createPaymentOrder, verifyPayment } = require('../controllers/paymentController');
const { protect, requireApproval } = require('../middleware/auth');

router.use(protect);

router.post('/create-order', requireApproval, createPaymentOrder);
router.post('/verify', verifyPayment);

module.exports = router;

