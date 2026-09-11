const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staff_id :{type :String,  unique: true,required: true,},
  name: { type: String },
  email: { type: String },
  phone: { type: String, required: true },
  joinDate: { type: String, required: true },
  aadharNumber: { type: String },
  emergencyContact: { type: String },
  gender: { type: String, default: 'male', enum: ['male', 'female', 'other'] },
  age: { type: Number },
  qualification: { type: String },
  photo: { type: String },
  certificate: { type: String },
  role: { type: String, default: 'stylist', enum: ['stylist', 'manager', 'receptionist'] },
  specialization: { type: String },
  salary: { type: Number, default: 0 },
  address: { type: String },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },

}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
