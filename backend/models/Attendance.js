const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  // deviceVisitorId: String,
  date: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent', 'half-day'],
    default: 'present',
  },
  checkIn: { type: String },
  checkOut: { type: String },
  absentType: {
    type: String,
    enum: ['casual_leave', 'lop'],
  },
  halfDayType: {
    type: String,
    enum: ['first_half', 'second_half'],
  },
  notes: { type: String },
}, { timestamps: true });

attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
