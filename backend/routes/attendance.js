const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const { imageMulter, uploadImage } = require( "../middleware/imagemulter.js");

const  dotenv = require ("dotenv");

dotenv.config();

// GET /attendance - List attendance with filters
router.get('/', async (req, res) => {
  try {
    const { staffId = '', dateFrom = '', dateTo = '', month = '', year = '' } = req.query;
    const where = {};
    if (staffId) where.staffId = staffId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.$gte = dateFrom;
      if (dateTo) where.date.$lte = dateTo;
    }
    // Month/Year filter (e.g. month=7, year=2025)
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      where.date = { $gte: startDate, $lt: endDate };
    }

    const attendance = await Attendance.find(where).populate('staffId').sort({ date: -1 });
    const result = attendance.map(a => ({ ...a.toObject(), staff: a.staffId }));
    res.json({ attendance: result });
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /attendance/summary/:staffId - Get attendance summary for a staff member
router.get('/summary/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { month = '', year = '' } = req.query;

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    // Build date filter
    const where = { staffId };
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      where.date = { $gte: startDate, $lt: endDate };
    }

    const records = await Attendance.find(where).sort({ date: 1 });

    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const halfDays = records.filter(r => r.status === 'half-day').length;
    const lopDays = records.filter(r => r.status === 'absent' && r.absentType === 'lop').length;
    const casualLeaveDays = records.filter(r => r.status === 'absent' && r.absentType === 'casual_leave').length;
    const firstHalfDays = records.filter(r => r.status === 'half-day' && r.halfDayType === 'first_half').length;
    const secondHalfDays = records.filter(r => r.status === 'half-day' && r.halfDayType === 'second_half').length;

    // Salary calculation: Base salary - deductions for LOP days
    // Per day salary = base salary / 30
    const baseSalary = staff.salary || 0;
    const perDaySalary = baseSalary / 30;
    const lopDeduction = lopDays * perDaySalary;
    // Half-day counts as half LOP if it's a half-day present
    const halfDayDeduction = halfDays * (perDaySalary / 2);
    const totalDeduction = lopDeduction + halfDayDeduction;
    const netSalary = Math.max(0, baseSalary - totalDeduction);

    res.json({
      staff: {
        _id: staff._id,
        staffId: staff.staffId,
        name: staff.name,
        photo: staff.photo,
        role: staff.role,
        salary: staff.salary,
        branch: staff.branch,
      },
      summary: {
        presentDays,
        absentDays,
        halfDays,
        lopDays,
        casualLeaveDays,
        firstHalfDays,
        secondHalfDays,
        totalRecords: records.length,
        baseSalary,
        perDaySalary: Math.round(perDaySalary * 100) / 100,
        lopDeduction: Math.round(lopDeduction * 100) / 100,
        halfDayDeduction: Math.round(halfDayDeduction * 100) / 100,
        totalDeduction: Math.round(totalDeduction * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
      },
      records,
    });
  } catch (err) {
    console.error('Get attendance summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /attendance/payroll - Get payroll summary for all staff
router.get('/payroll', async (req, res) => {
  try {
    const { month = '', year = '' } = req.query;
    const allStaff = await Staff.find();

    const payroll = await Promise.all(allStaff.map(async (staff) => {
      const where = { staffId: staff._id };
      if (month && year) {
        const m = parseInt(month);
        const y = parseInt(year);
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const nextMonth = m === 12 ? 1 : m + 1;
        const nextYear = m === 12 ? y + 1 : y;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        where.date = { $gte: startDate, $lt: endDate };
      }

      const records = await Attendance.find(where);
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const halfDays = records.filter(r => r.status === 'half-day').length;
      const lopDays = records.filter(r => r.status === 'absent' && r.absentType === 'lop').length;

      const baseSalary = staff.salary || 0;
      const perDaySalary = baseSalary / 30;
      const lopDeduction = lopDays * perDaySalary;
      const halfDayDeduction = halfDays * (perDaySalary / 2);
      const totalDeduction = lopDeduction + halfDayDeduction;
      const netSalary = Math.max(0, baseSalary - totalDeduction);

      return {
        _id: staff._id,
        staffId: staff.staffId,
        name: staff.name,
        photo: staff.photo,
        role: staff.role,
        branch: staff.branch,
        baseSalary,
        presentDays,
        absentDays,
        halfDays,
        lopDays,
        totalDeduction: Math.round(totalDeduction * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
      };
    }));

    res.json({ payroll });
  } catch (err) {
    console.error('Get payroll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /attendance - Create attendance record
router.post('/', async (req, res) => {
  try {
    const { staffId, date, status, checkIn, checkOut, absentType, halfDayType, notes } = req.body;
    if (!staffId || !date || !status) {
      return res.status(400).json({ error: 'Staff, date, and status are required' });
    }

    // Validate: if present, checkIn is required
    if (status === 'present' && !checkIn) {
      return res.status(400).json({ error: 'Check-in time is required for present status' });
    }

    // Validate: if absent, absentType is required
    if (status === 'absent' && !absentType) {
      return res.status(400).json({ error: 'Absent type (casual_leave or lop) is required' });
    }

    // Validate: if half-day, halfDayType is required
    if (status === 'half-day' && !halfDayType) {
      return res.status(400).json({ error: 'Half day type (first_half or second_half) is required' });
    }

    // Check for duplicate: one record per staff per date
    const existing = await Attendance.findOne({ staffId, date });
    if (existing) {
      return res.status(409).json({ error: 'Attendance already recorded for this staff on this date' });
    }

    const attendance = await Attendance.create({
      staffId, date, status, checkIn, checkOut, absentType, halfDayType, notes,
    });
    const populated = await Attendance.findById(attendance._id).populate('staffId');
    res.status(201).json({ attendance: { ...populated.toObject(), staff: populated.staffId } });
  } catch (err) {
    console.error('Create attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /attendance/:id - Update attendance record
router.put('/:id', async (req, res) => {
  try {
    const { staffId, date, status, checkIn, checkOut, absentType, halfDayType, notes } = req.body;

    // Validate status-specific fields
    if (status === 'present' && !checkIn) {
      return res.status(400).json({ error: 'Check-in time is required for present status' });
    }
    if (status === 'absent' && !absentType) {
      return res.status(400).json({ error: 'Absent type is required for absent status' });
    }
    if (status === 'half-day' && !halfDayType) {
      return res.status(400).json({ error: 'Half day type is required for half-day status' });
    }

    // Check duplicate on update (excluding current record)
    if (staffId && date) {
      const existing = await Attendance.findOne({ staffId, date, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ error: 'Attendance already recorded for this staff on this date' });
      }
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { staffId, date, status, checkIn, checkOut, absentType, halfDayType, notes },
      { returnDocument: 'after', runValidators: true }
    ).populate('staffId');

    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
    res.json({ attendance: { ...attendance.toObject(), staff: attendance.staffId } });
  } catch (err) {
    console.error('Update attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /attendance/:id/checkout - Quick check-out
router.put('/:id/checkout', async (req, res) => {
  try {
    const { checkOut } = req.body;
    if (!checkOut) return res.status(400).json({ error: 'Check-out time is required' });

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { checkOut },
      { returnDocument: 'after', runValidators: true }
    ).populate('staffId');

    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
    res.json({ attendance: { ...attendance.toObject(), staff: attendance.staffId } });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /attendance/:id
router.delete('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete attendance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// router.post('/fingerprint', async (req, res) => {
//   try {
//        const {name, email, deviceVisitorId } = req.body;

//         if (!name || !email || !deviceVisitorId) {
//             return res.status(400).json({ error: 'Name, email and fingerprint ID are required' });
//         }

//       const fingerprintApiKey = process.env.FINGERPRINT_API_KEY; 
//       if (!fingerprintApiKey) {
//          return res.status(500).json({
//             status: false,
//             message: "Fingerprint API key is not configured"
//            });
//           }

//           console.log("Fingerprint API key loaded");

//           const cleanName = String(name).trim();
//           const cleanEmail = String(email).trim();
//           const cleanDeviceVisitorId = String(deviceVisitorId).trim();

//             const staff = await Staff.findOne({
//               name: cleanName, email: cleanEmail
//             });


//         if (!staff) {
//           return res.status(404).json({
//             status: false,
//             message: "Staff not found"
//           });
//         }

//         if ( !staff.name || staff.name.trim().toLowerCase() !== cleanName.toLowerCase() ) { return res.status(409).json({ status: false, message: "Staff name does not match" }); } if ( !staff.email || staff.email.trim().toLowerCase() !== cleanEmail.toLowerCase() ) { return res.status(409).json({ status: false, message: "Staff email does not match" }); }

//         const now = new Date();

//        const today = new Date().toISOString().split("T")[0];

//        const otherStaffAttendance = await Attendance.findOne({ 
//         deviceVisitorId: cleanDeviceVisitorId, 
//         staffId: { $ne: staff._id }, 
//         date: today
//        });

//        if (otherStaffAttendance) { return res.status(403).json({ 
//         status: false, 
//         message: "Access denied. This device is already registered to another staff member today.",
//         code: "DEVICE_ALREADY_USED_BY_ANOTHER_STAFF"
//        }); }

//         let attendance = await Attendance.findOne({staffId: staff._id, date: today});

//         if (!attendance) {
//         attendance = await Attendance.create({
//           staffId: staff._id,
//           deviceVisitorId : cleanDeviceVisitorId,
//           branchId: staff.branchId,
//           date: today,
//           checkIn: now,
//           checkOut: null,
//           status: "present"
//         });

//       const populatedAttendance =  await Attendance.findById(attendance._id);
      
//       return res.status(200).json({
//         status: true,
//         type: "CHECK_IN",
//         message: "Check-in successful",
//         staff: {
//           id: staff._id,
//           staff_id: staff.staff_id,
//           name: staff.name,
//           email: staff.email,
//           phone: staff.phone,
//           deviceVisitorId: cleanDeviceVisitorId  
//         },
//         attendance : populatedAttendance
//       });
//     }

//     if (!attendance.checkOut) {

//       attendance.checkOut = now;

//       await attendance.save();

//      const populatedAttendance =  await Attendance.findById(attendance._id);

//       return res.status(200).json({
//         status: true,
//         type: "CHECK_OUT",
//         message: "Check-out successful",
//         staff: {
//           id: staff._id,
//           staff_id: staff.staff_id,
//           name: staff.name,
//           email: staff.email,
//           phone: staff.phone,
//           deviceVisitorId: cleanDeviceVisitorId  
//         },
//         attendance : populatedAttendance
//       });
//     }

//     return res.status(409).json({
//       status: false,
//       message: "Attendance already completed today",
//       staff :{
//         staff_id: staff.staff_id,
//         name: staff.name
//       }
//     });

//     }catch (error) {
//     console.error("Fingerprint attendance error:", error);
//     return res.status(500).json({
//       status: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// });


// face login attendance 





router.post(
  "/facelogin",
  imageMulter.fields([
    {
      name: "photo",
      maxCount: 1,
    },
  ]),
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          status: false,
          message: "Name is required",
        });
      }

      const cleanName = name.trim();

      const staff = await Staff.findOne({
        name: cleanName,
      });

      if (!staff) {
        return res.status(404).json({
          status: false,
          message: "Staff not found",
        });
      }

      const photoFile = req.files?.photo?.[0];

      if (!photoFile) {
        return res.status(400).json({
          status: false,
          message: "Photo is required",
        });
      }
      const upload = await uploadImage(photoFile);

      if (!upload?.secure_url) {
        return res.status(500).json({
          status: false,
          message: "Photo upload failed",
        });
      }
      let userIp =
        req.headers["x-forwarded-for"] ||
        req.socket?.remoteAddress ||
        req.ip;

      userIp = String(userIp || "").trim();

      // If proxy gives multiple IPs
      if (userIp.includes(",")) {
        userIp = userIp.split(",")[0].trim();
      }

      if (userIp === "::1") {
        userIp = "192.168.0.7";
      }

      if (userIp.startsWith("::ffff:")) {
        userIp = userIp.replace("::ffff:", "");
      }

          if (!userIp) {
            return res.status(400).json({
              status: false,
              message: "IP address not found",
            });
          }

      console.log("Face Login IP:", userIp);

      const now = new Date();

      const today = now.toISOString().split("T")[0];

      const currentTime = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      let attendance = await Attendance.findOne({
        staffId: staff._id,
        date: today,
      });

      if (!attendance) {
        attendance = await Attendance.create({
          staffId: staff._id,
          branchId: staff.branchId,
          name: staff.name,
          photo: upload.secure_url,
          ipAddress: userIp,
          date: today,
          status: "present",
          checkIn: currentTime,
          checkOut: null,
        });

        const populatedAttendance = await Attendance.findById(
          attendance._id
        );

        return res.status(200).json({
          status: true,
          type: "CHECK_IN",
          message: "Check-in successful",
          staff: {
            id: staff._id,
            staff_id: staff.staff_id,
            name: staff.name,
          },
          data: populatedAttendance,
        });
      }

      if (!attendance.checkOut) {
        attendance.checkOut = currentTime;

        await attendance.save();

        const populatedAttendance = await Attendance.findById(
          attendance._id
        );

        return res.status(200).json({
          status: true,
          type: "CHECK_OUT",
          message: "Check-out successful",
          staff: {
            staff_id: staff.staff_id,
            name: staff.name,
          },
          data: populatedAttendance,
        });
      }

      return res.status(409).json({
        status: false,
        type: "ALREADY_COMPLETED",
        message: "Attendance already completed today",
        staff: {
          staff_id: staff.staff_id,
          name: staff.name,
        },
      });

    } catch (error) {
      console.error("Face login error:", error);

      return res.status(500).json({
        status: false,
        message: "Face login failed",
        error: error.message,
      });
    }
  }
);





// router.put(
//   "/:staffId/fingerprint",
//   authenticateToken,
//   async (req, res) => {
//     try {

//       const { fingerprintId } = req.body;

//       if (!fingerprintId) {
//         return res.status(400).json({
//           success: false,
//           message: "Fingerprint ID is required"
//         });
//       }

//       // Check staff exists
//       const staff = await Staff.findById(req.params.staffId);

//       if (!staff) {
//         return res.status(404).json({
//           success: false,
//           message: "Staff not found"
//         });
//       }

//       // Check fingerprint already belongs to another staff
//       const fingerprintExists = await Staff.findOne({
//         fingerprintId,
//         _id: { $ne: staff._id }
//       });

//       if (fingerprintExists) {
//         return res.status(409).json({
//           success: false,
//           message: "This fingerprint is already registered"
//         });
//       }

//       // Save fingerprint
//       staff.fingerprintId = fingerprintId;

//       await staff.save();

//       return res.status(200).json({
//         success: true,
//         message: "Fingerprint registered successfully",
//         data: {
//           staffId: staff._id,
//           staff_code: staff.staff_id,
//           name: staff.name,
//           fingerprintId: staff.fingerprintId
//         }
//       });

//     } catch (error) {

//       console.error("Fingerprint registration error:", error);

//       return res.status(500).json({
//         success: false,
//         message: "Internal server error",
//         error: error.message
//       });
//     }
//   }
// );


module.exports = router;
