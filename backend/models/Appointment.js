const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  clientName : {type :String, required: false},
  clientNumber : {type :Number, required: false},
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: false },
  serviceComboId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCombo', required: false },
  date: { type: String, required: true }, 
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  notes: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'completed', 'cancelled'] },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
