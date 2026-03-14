const GoldItem = require('../models/GoldItem');

// Create a new gold item
const createGoldItem = async (req, res) => {
  try {
    const newItem = new GoldItem(req.body);
    await newItem.save();
    res.status(201).json({ success: true, data: newItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all gold items
const getAllGoldItems = async (req, res) => {
  try {
    const items = await GoldItem.find();
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get gold item by ID
const getGoldItemById = async (req, res) => {
  try {
    const item = await GoldItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Gold item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update gold item
const updateGoldItem = async (req, res) => {
  try {
    const item = await GoldItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) {
      return res.status(404).json({ success: false, error: 'Gold item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete gold item
const deleteGoldItem = async (req, res) => {
  try {
    const item = await GoldItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Gold item not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createGoldItem,
  getAllGoldItems,
  getGoldItemById,
  updateGoldItem,
  deleteGoldItem
};
