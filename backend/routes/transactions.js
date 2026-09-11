const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Client = require('../models/Client');
const ClientBill = require('../models/ClientBill');
// const ServiceCombo = require('../models/ServiceCombo');


const { authenticateToken } = require('../middleware/auth');

//  client/ transaction
router.get("/client/transaction", async (req, res) => {

  try {
        const { search = '', status = '', paymentMethod = '', dateFrom = '', dateTo = '' } = req.query;
          const where = {};
          if (status) where.status = status;
          if (paymentMethod) where.paymentMethod = paymentMethod;
          if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) where.date.$gte = dateFrom;
            if (dateTo) where.date.$lte = dateTo;
          }

          let bills = await ClientBill.find(where)
      .populate("clientId", " name phone email branchId")
      .sort({ createdAt: -1 });

       if (search) {
      const searchText = search.toLowerCase();

      bills = bills.filter((bill) =>
        bill.clientId?.name?.toLowerCase().includes(searchText) ||
        bill.clientId?.phone?.toLowerCase().includes(searchText) ||
        bill.clientId?.branchId?.toLowerCase().includes(searchText) ||
        bill.billId?.toLowerCase().includes(searchText) 
      );
    }
       const result = bills.map((bill) => ({
      clientId: bill.clientId?._id || null,

      client: bill.clientId
        ? {
            name: bill.clientId.name,
            phone: bill.clientId.phone,
            email: bill.clientId.email,
            branchId: bill.clientId.branchId,
          }
        : null,

         billId: bill.billId,
        date: bill.date,
        paymentMethod: bill.paymentMethod,
        amount: bill.amount,
        status: bill.status,
        totalAmount: bill.totalAmount,
        createdAt: bill.createdAt,
      }));
return res.status(200).json({
      success: true,
      count: result.length,
      transactions: result,
    });
     } catch (err) {
    console.error("Get client transactions error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', paymentMethod = '', dateFrom = '', dateTo = '' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.$gte = dateFrom;
      if (dateTo) where.date.$lte = dateTo;
    }

    let transactions = await Transaction.find(where).populate('clientId', 'name phone email').populate ('serviceId', 'name amount').populate('serviceComboId','name totalPrice').sort({ createdAt: -1 });

    if (search) {
      transactions = transactions.filter(t =>
        t.clientId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.transactionId?.includes(search)
      );
    }

    const result = transactions.map(t => ({ ...t.toObject(), client: t.clientId }));
    res.json({ transactions: result });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { status, paymentMethod, date, clientId, serviceId,serviceComboId, amount } = req.body;
    if (!clientId || !date || amount === undefined) return res.status(400).json({ error: 'Client, date, and amount are required' });
  
    const transaction = await Transaction.create({ status: status || 'pending', paymentMethod: paymentMethod || 'cash', date, clientId,serviceId,serviceComboId, amount: parseFloat(amount) });
  
    const populated = await Transaction.findById(transaction._id).populate('clientId', 'name phone email');
  
    res.status(201).json({ transaction: { ...populated.toObject() } });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.body.amount) req.body.amount = parseFloat(req.body.amount);
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('clientId', 'name phone email');
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ transaction: { ...transaction.toObject(), client: transaction.clientId } });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
