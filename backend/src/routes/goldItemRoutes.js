const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createGoldItem,
  getAllGoldItems,
  getGoldItemById,
  updateGoldItem,
  deleteGoldItem
} = require('../controllers/goldItemController');

// All routes are protected and admin-only
router.route('/')
  .post(protect, admin, createGoldItem)
  .get(protect, admin, getAllGoldItems);

router.route('/:id')
  .get(protect, admin, getGoldItemById)
  .put(protect, admin, updateGoldItem)
  .delete(protect, admin, deleteGoldItem);

module.exports = router;
