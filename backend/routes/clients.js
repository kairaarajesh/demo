const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { authenticateToken } = require('../middleware/auth');


router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const where = {};
    if (search) {
      where.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const clients = await Client.find(where).sort(sort);
    res.json({ clients });
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const { name, phone, gender, branchId, membership_card } = req.body;

    const clients = new Client({
         name,
         phone, 
         gender,
         branchId,
         membership_card
    });

    const cli = await clients.save();

    res.status(201).json({
      Message:"Client Create Successfully",
      data: cli });
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  try {
    const { membership_card, branchId } = req.body;
    const client = await Client.findByIdAndUpdate(req.params.id,
      {
          $set: {
          ...req.body,
          membership_card: membership_card || null,
          branchId: branchId || null,
        },
      },
       { new: true, runValidators: true });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ client });
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
