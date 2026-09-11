const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  gstNumber: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
