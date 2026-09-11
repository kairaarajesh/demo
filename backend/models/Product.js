const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  vName: {type : String},
  vNumber: {type: Number},
  vAddress :{type: String },
  brand: { type: String, required: true },
  pName: { type: String, required: true },
  count: { type: Number, default: 0 },
  pricePerUnit: { type: Number, default: 0 },
  subTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  dateAdded: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
