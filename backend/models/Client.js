const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  // billId: { type: String, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  gender: { type: String, default: 'male', enum: ['male', 'female', 'other'] },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  membership_card: {type: String, required: false },

}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
