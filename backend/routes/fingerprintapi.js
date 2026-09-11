router.post('/fingerprint', async (req, res) => {
  try {
       const {name, email, fingerprintId, deviceVisitorId } = req.body;

        if (!name || !email || !fingerprintId) {
            return res.status(400).json({ error: 'Name, email and fingerprint ID are required' });
        }

        const cleanFingerprintId = String(fingerprintId).trim();  

        const staff = await Staff.findOne({
          name: name.trim(),
          email: email.trim(),
          fingerprintId: cleanFingerprintId
        });


        if (!staff) {
          return res.status(404).json({
            status: false,
            message: "Fingerprint not registered"
          });
        }

        // --- Device fraud signal (does not affect identity/auth) ---
        let deviceFlag = null;
        if (deviceVisitorId) {
          const recentOtherStaffOnDevice = await Attendance.findOne({
            deviceVisitorId,
            staffId: { $ne: staff._id },
            date: new Date().toISOString().split("T")[0]
          });
          if (recentOtherStaffOnDevice) {
            deviceFlag = "MULTIPLE_STAFF_SAME_DEVICE_TODAY";
            console.warn(`Device ${deviceVisitorId} used by multiple staff today`, {
              staffId: staff._id,
              otherStaffId: recentOtherStaffOnDevice.staffId
            });
          }
        }

        const now = new Date();

       const today = new Date().toISOString().split("T")[0];

        let attendance = await Attendance.findOne({staffId: staff._id, date: today});

      if (!attendance) {
      attendance = await Attendance.create({
        staffId: staff._id,
        fingerprintId: staff.fingerprintId,
        deviceVisitorId: deviceVisitorId || null,
        branchId: staff.branchId,
        date: today,
        checkIn: now,
        checkOut: null,
        status: "present"
      });

      const populatedAttendance =  await Attendance.findById(attendance._id);
      
      return res.status(200).json({
        status: true,
        type: "CHECK_IN",
        message: "Check-in successful",
        staff: {
          id: staff._id,
          staff_id: staff.staff_id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          fingerprintId: staff.fingerprintId
        },
        attendance : populatedAttendance
      });
    }

    if (!attendance.checkOut) {

      attendance.checkOut = now;

      await attendance.save();

     const populatedAttendance =  await Attendance.findById(attendance._id);

      return res.status(200).json({
        status: true,
        type: "CHECK_OUT",
        message: "Check-out successful",
        staff: {
          id: staff._id,
          staff_id: staff.staff_id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          fingerprintId: staff.fingerprintId
        },
        attendance : populatedAttendance
      });
    }

    return res.status(409).json({
      status: false,
      message: "Attendance already completed today",
      staff :{
        staff_id: staff.staff_id,
        name: staff.name
      }
    });

    }catch (error) {

    console.error("Fingerprint attendance error:", error);

    return res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message
    });
  }
});