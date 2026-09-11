const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: {type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true,lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {type: String, enum: ['super_admin', 'admin',],default: 'admin'},
  permission:{ type: Object ,default : {} },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
}, {
  timestamps: true
});

// Remove password from JSON output
adminSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);