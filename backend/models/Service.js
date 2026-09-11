const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  gender: { type: String, default: 'unisex', enum: ['male', 'female', 'unisex'] },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
