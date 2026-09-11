const mongoose = require('mongoose');

const billServiceSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: false },
  serviceComboId: { type: mongoose.Schema.Types.ObjectId, ref: 'serviceCombo', required: false },
  serviceName: { type: String, required: true },
  amount: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1, min: 1 },
  serviceAmount: { type: Number, required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  staffName: { type: String },
}, { _id: false });

const billProductSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    pName : { type: String, required: true },
    brand : { type: String, required: true },
    count : { type: String, required: true },
    pricePerUnit : { type: String, required: true },
})

const clientBillSchema = new mongoose.Schema({
  billId: { type: String, unique: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: false },
  services: [billServiceSchema],
  product : [billProductSchema],
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0 },
  clientAmount: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 5 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentMethod: { type: Object ,default : {} },
  status: {
    type: String,
    default: 'paid',
    enum: ['paid', 'pending', 'refunded'],
  },
  date: { type: String, required: true },
}, { timestamps: true });

// Auto-generate bill ID
clientBillSchema.pre('save', async function () {
  if (!this.billId) {
    const count = await this.constructor.countDocuments();
    this.billId = `BILL-${String(count + 1).padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('ClientBill', clientBillSchema);
