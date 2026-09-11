const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
    res.json({ branches });
  } catch (err) {
    console.error('Get branches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, gstNumber } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name is required' });
    const branch = await Branch.create({ name, email, phone, address, gstNumber });
    res.status(201).json({ branch });
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ branch });
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
