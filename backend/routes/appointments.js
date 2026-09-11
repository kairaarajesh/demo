const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');
const Staff = require('../models/Staff');
const Service = require('../models/Service');
const { authenticateToken } = require('../middleware/auth');

// GET /api/appointments
router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', staffId = '', serviceId = '', dateFrom = '', dateTo = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (staffId) where.staffId = staffId;
    if (serviceId) where.serviceId = serviceId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.$gte = dateFrom;
      if (dateTo) where.date.$lte = dateTo;
    }

    let appointments = await Appointment.find(where)
      .populate('clientId', 'name phone email')
      .populate('staffId', 'name role')
      .populate('serviceId', 'name amount')
      .sort({ date: -1 });

    // Client name search (post-filter since it's populated)
    if (search) {
      appointments = appointments.filter(a =>
        a.clientId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.clientId?.phone?.includes(search)
      );
    }

    function convertTo12Hour(time) {
      const [hour, minute] = time.split(":").map(Number);

      const date = new Date();
      date.setHours(hour, minute);

      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    // Normalize field names for frontend
    const result = appointments.map(a => ({
      ...a.toObject(),
      client: a.clientId,
      staff: a.staffId,
      service: a.serviceId,
      startTime: convertTo12Hour(a.startTime),
      endTime: convertTo12Hour(a.endTime),  
    }));

    res.json({ appointments: result });
  } catch (err) {
    console.error('Get appointments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/appointments
router.post('/', async (req, res) => {
  try {
    const { clientId, staffId, serviceId,serviceComboId, date, startTime, endTime, notes, status, clientName, clientNumber } = req.body;
    
    if (!staffId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (!serviceId && !serviceComboId) {
      return res.status(400).json({
        error: 'Either serviceId or serviceComboId must be provided'
      });
    }

    // Prevent sending both (optional)
    if (serviceId && serviceComboId) {
      return res.status(400).json({
        error: 'Provide either serviceId or serviceComboId, not both'
      });
    }
    

    // Check for overlapping staff appointments
    const overlapping = await Appointment.findOne({
      staffId,
      date,
      status: { $ne: 'cancelled' },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (overlapping) {
      return res.status(409).json({ error: 'Staff member has an overlapping appointment at this time' });
    }

    const appointment = await Appointment.create({
      clientId, staffId, serviceId, serviceComboId, date, startTime, endTime, notes, clientName,clientNumber, status: status || 'pending',
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('clientId', 'name phone')
      .populate('staffId', 'name role')
      .populate('serviceId', 'name amount')
      .populate('serviceComboId', 'name totalPrice');

    res.status(201).json({ appointment: populated });
  } catch (err) {
    console.error('Create appointment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/appointments/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { startTime, endTime, date, staffId } = req.body;
    const existing = await Appointment.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    const sId = staffId || existing.staffId;
    const d = date || existing.date;
    const st = startTime || existing.startTime;
    const et = endTime || existing.endTime;

    const overlapping = await Appointment.findOne({
      staffId: sId,
      date: d,
      status: { $ne: 'cancelled' },
      _id: { $ne: req.params.id },
      startTime: { $lt: et },
      endTime: { $gt: st },
    });

    if (overlapping) {
      return res.status(409).json({ error: 'Staff member has an overlapping appointment at this time' });
    }

    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('clientId', 'name phone email')
      .populate('staffId', 'name role')
      .populate('serviceId', 'name amount')
      .populate('serviceComboId', 'name totalPrice');

    const result = { ...appointment.toObject(), client: appointment.clientId, staff: appointment.staffId, service: appointment.serviceId,  serviceCombo: appointment.serviceComboId };
    res.json({ appointment: result });
  } catch (err) {
    console.error('Update appointment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete appointment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
