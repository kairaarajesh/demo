const express = require('express');
const router = express.Router();
const ServiceCombo = require('../models/ServiceCombo');
const Service = require('../models/Service');
const { authenticateToken } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const combos = await ServiceCombo.find().populate('services').sort({ createdAt: -1 });
    // Map services to items format for frontend compatibility
    const result = combos.map(c => ({
      ...c.toObject(),
      items: (c.services || []).map(s => ({ service: s, serviceId: s._id })),
    }));
    res.json({ combos: result });
  } catch (err) {
    console.error('Get combos error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, serviceIds } = req.body;
    if (!name || !serviceIds || serviceIds.length === 0) {
      return res.status(400).json({ error: 'Combo name and at least one service are required' });
    }
    const services = await Service.find({ _id: { $in: serviceIds } });
    const totalPrice = services.reduce((sum, s) => sum + s.amount, 0);
    const combo = await ServiceCombo.create({ name, totalPrice, services: serviceIds });
    const populated = await ServiceCombo.findById(combo._id).populate('services');
    const result = { ...populated.toObject(), items: (populated.services || []).map(s => ({ service: s, serviceId: s._id })) };
    res.status(201).json({ combo: result });
  } catch (err) {
    console.error('Create combo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, serviceIds } = req.body;
    const updateData = {};
    if (name) updateData.name = name;

    if (serviceIds && serviceIds.length > 0) {
      const services = await Service.find({ _id: { $in: serviceIds } });
      updateData.totalPrice = services.reduce((sum, s) => sum + s.amount, 0);
      updateData.services = serviceIds;
    }

    const combo = await ServiceCombo.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('services');
    if (!combo) return res.status(404).json({ error: 'Combo not found' });
    const result = { ...combo.toObject(), items: (combo.services || []).map(s => ({ service: s, serviceId: s._id })) };
    res.json({ combo: result });
  } catch (err) {
    console.error('Update combo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const combo = await ServiceCombo.findByIdAndDelete(req.params.id);
    if (!combo) return res.status(404).json({ error: 'Combo not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete combo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
