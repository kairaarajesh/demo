const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true },
  status: { type: String, default: 'pending', enum: ['paid', 'pending', 'refunded'] },
  paymentMethod: { type: Object, default: {} },
  date: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: false },
  serviceComboId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCombo', required: false },
  amount: { type: Number, required: true },
}, { timestamps: true });

// Auto-generate transaction ID
transactionSchema.pre('save', async function () {
  if (!this.transactionId) {
    const count = await this.constructor.countDocuments();
    this.transactionId = `TXN-${String(count + 1).padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
