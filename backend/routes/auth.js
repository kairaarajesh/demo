const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const { signToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    
    console.log("Password:", { password });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });

    // Create admin if not found (for testing only - remove in production)
    if (!admin) {
      const newAdmin = await Admin.create({
        email,
        password,  // In production, use bcrypt to hash this
        name: "Admin",
        role: "admin",
        permission: "permission",
        branchId: "branchId"
      });

      const token = signToken({
        id: newAdmin._id,
        email: newAdmin.email,
        role: newAdmin.role,
        permission: newAdmin.role,
        branchId: newAdmin.branchId,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: newAdmin._id,
          email: newAdmin.email,
          name: newAdmin.name,
          role: newAdmin.role,
          permission : newAdmin.permission,
          branchId : newAdmin.branchId
        },
      });
    }

    // Compare password (use bcrypt.compare in production)
    if (admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = signToken({
      id: admin._id,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      permission : admin.permission,
      branchId : admin.branchId


    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive :admin.isActive,
        permission : admin.permission,
        branchId : admin.branchId

      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {

    const admin = await Admin.find().select('-password');
   
    res.json({ 
      success: true,
      Admin : admin 
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// POST /api/auth/register - Only authenticated admins can register new admins
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, permission, branchId } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin with this email already exists",
      });
    }

    // Create new user
    const admin = await Admin.create({
      name,
      email,
      password,
      permission,
      branchId
    });

    // Remove password from response
    const adminData = admin.toObject();
    delete adminData.password;

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: adminData
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Optional: GET /api/auth/users - List all users (admin only)
router.get('/users', async (req, res) => {
  try {
    // Get all users except password
    const users = await Admin.find()
      .select("-password")
      .sort({ createdAt: -1 });

    // Print users in console
    console.log("Users:", users);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

//   Optional: Update /api/auth/update -
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Admin.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Permission updated successfully",
      data: permission,
    });
  } catch (err) {
    console.error("Update permission error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Admin.findByIdAndDelete(id);

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Permission deleted successfully",
    });
  } catch (err) {
    console.error("Delete permission error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});


module.exports = router;