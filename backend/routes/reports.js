const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');
const Transaction = require('../models/Transaction');
const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Branch = require('../models/Branch');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      todayAppointments,
      totalClients,
      pendingTransactions,
      paidTransactions,
      totalStaff,
      totalServices,
      totalBranches,
      totalProducts,
      recentAppointments,
      recentTransactions,
    ] = await Promise.all([
      Appointment.countDocuments({ date: today }),
      Client.countDocuments(),
      Transaction.countDocuments({ status: 'pending' }),
      Transaction.find({ status: 'paid' }),
      Staff.countDocuments(),
      Service.countDocuments(),
      Branch.countDocuments(),
      Product.countDocuments(),
      Appointment.find().populate('clientId', 'name phone').populate('staffId', 'name role').populate('serviceId', 'name amount').sort({ createdAt: -1 }).limit(10),
      Transaction.find().populate('clientId', 'name phone amount').sort({ createdAt: -1 }).limit(10),
    ]);

    const totalRevenue = paidTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Appointment status breakdown
    const appointmentStatuses = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusFormatted = appointmentStatuses.map(s => ({ status: s._id, _count: { status: s.count } }));

    // Revenue by payment method
    const revenueByMethod = await Transaction.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' } } },
    ]);
    const methodFormatted = revenueByMethod.map(m => ({ paymentMethod: m._id, _sum: { amount: m.total } }));

    // Last 7 days appointments
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = await Appointment.countDocuments({ date: dateStr });
      last7Days.push({ date: dateStr, count });
    }

    // Normalize recent appointments
    const recentAppts = recentAppointments.map(a => ({
      ...a.toObject(),
      client: a.clientId,
      staff: a.staffId,
      service: a.serviceId,
    }));

    const recentTxns = recentTransactions.map(t => ({
      ...t.toObject(),
      client: t.clientId,
    }));

    res.json({
      metrics: { todayAppointments, totalClients, pendingTransactions, totalRevenue, totalStaff, totalServices, totalBranches, totalProducts },
      recentAppointments: recentAppts,
      recentTransactions: recentTxns,
      appointmentStatuses: statusFormatted,
      revenueByMethod: methodFormatted,
      last7Days,
    });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
