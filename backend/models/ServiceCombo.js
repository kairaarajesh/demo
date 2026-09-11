const mongoose = require('mongoose');

const serviceComboSchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalPrice: { type: Number, default: 0 },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
}, { timestamps: true });

module.exports = mongoose.model('ServiceCombo', serviceComboSchema);
