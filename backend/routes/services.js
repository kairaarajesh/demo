const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search = '', gender = '' } = req.query;
    const where = {};
    if (search) where.name = { $regex: search, $options: 'i' };
    if (gender) where.gender = gender;
    const services = await Service.find(where).sort({ createdAt: -1 });
    res.json({ services });
  } catch (err) {
    console.error('Get services error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, amount, gender } = req.body;
    if (!name || amount === undefined) return res.status(400).json({ error: 'Service name and amount are required' });
    const service = await Service.create({ name, amount: parseFloat(amount), gender: gender || 'unisex' });
    res.status(201).json({ service });
  } catch (err) {
    console.error('Create service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.body.amount) req.body.amount = parseFloat(req.body.amount);
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ service });
  } catch (err) {
    console.error('Update service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
