const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const { authenticateToken } = require('../middleware/auth');
const { imageMulter, uploadImage } = require( "../middleware/imagemulter.js");

router.get('/', async (req, res) => {
  try {
    const { search = '', role = '' } = req.query;
    const where = {};
    if (search) {
      where.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) where.role = role;
    const staff = await Staff.find(where).sort({ createdAt: -1 });
    res.json({ staff });
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) =>{
  try{
    const {id} = req.params;
    const staff = await Staff.findById(id);
    if(!staff){
      return res.status(404).json({error: 'Staff not found'});
    }
    return res.status(200).json({
      message : "Staff fetched successfully",
      data : staff
    });  
  }catch(error){
    console.error('Get staff by ID error:', error);
    res.status(500).json({error: 'Internal server error'});
  }
})

router.post(
  "/",

  imageMulter.fields([
    {
      name: "photo",
      maxCount: 1,
    },
    {
      name: "certificate",
      maxCount: 1,
    },
  ]),

  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        joinDate,
        aadharNumber,
        emergencyContact,
        gender,
        age,
        qualification,
        role,
        specialization,
        salary,
        address,
        branchId,
      } = req.body;

      if (!name || !phone || !joinDate) {
        return res.status(400).json({
          success: false,
          error: "Name, phone, and join date are required",
        });
      }

      let photoUrl = null;
      let certificateUrl = null;

      // PHOTO
      if (req.files?.photo?.[0]) {
        const result = await uploadImage(
          req.files.photo[0]
        );

        photoUrl = result.secure_url;
      }

      // CERTIFICATE
      if (req.files?.certificate?.[0]) {
        const result = await uploadImage(
          req.files.certificate[0]
        );

        certificateUrl = result.secure_url;
      }

      const lastStaff = await Staff.findOne({
        staff_id: {
          $regex: /^STF\d+$/,
        },
      }).sort({
        staff_id: -1,
      });

      let nextNumber = 1;

      if (lastStaff?.staff_id) {
        nextNumber =
          parseInt(
            lastStaff.staff_id.replace("STF", ""),
            10
          ) + 1;
      }

      const staff_id =
        `STF${String(nextNumber).padStart(4, "0")}`;

      const staff = await Staff.create({
        staff_id,
        branchId,
        name,
        email,
        phone,
        joinDate,
        aadharNumber,
        emergencyContact,
        gender: gender || "male",
        age,
        qualification,
        photo: photoUrl,
        certificate: certificateUrl,
        role: role || "stylist",
        specialization,
        salary: salary || 0,
        address,
      });

      return res.status(201).json({
        success: true,
        message: "Staff created successfully",
        data: staff,
      });

    } catch (error) {
      console.error("Create staff error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json({ staff });
  } catch (err) {
    console.error('Update staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
