// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const Patient = require("../models/patient");
const Staff = require("../models/staff");
const authLimiter = require('../middleware/auth');
const protect = require('../middleware/auth');
const authorize = require('../middleware/auth');
const requirePermission = require('../middleware/auth');
const sessionManager = require('../middleware/auth');
const auditLog = require('../middleware/auth');
//const { generateToken, generateRefreshToken } = require('../utils/tokenUtils');


// Generate JWT
const generateToken = (user, sessionId) =>
  jwt.sign({ id: user._id, role: user.role, sessionId: sessionId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
  });

  // Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};


// Register (separate for patient and staff)
router.post('/register/patient', authLimiter,  async (req, res) => {
  try {
    const { name, email, password, phone, dateOfBirth, gender, category } = req.body;
   
// Input validation
    if (!name || !email || !password || !dateOfBirth || !gender || !category) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create user
    const user = new User({
      name,
      email,
      password,
      phone,
      role: 'patient',
      permissions: ['read_patients'] // Basic patient permissions
    });
    
    await user.save();
    
    // Create patient profile
    const patient = new Patient({
      userId: user._id,
      name,
      email,
      phone,
      dateOfBirth,
      gender,
      category
    });
    
    await patient.save();
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        userId: user.userId,
        patientId: patient.patientId,
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    console.error('Patient registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.post('/register/staff', authLimiter, protect,  async (req, res) => {
  try {
    const { name, email, password, phone, role, department, licenseNumber } = req.body;
    
// Input validation
    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Set default permissions based on role
    const defaultPermissions = {
      doctor: ['read_patients', 'write_patients', 'read_medical_records', 'write_medical_records'],
      nurse: ['read_patients', 'write_patients'],
      admin: ['read_patients', 'write_patients', 'delete_patients', 'read_staff', 'write_staff', 'admin_dashboard'],
      lab_technician: ['read_patients', 'read_lab_results', 'write_lab_results']
    };
    
    // Create user
    const user = new User({
      name,
      email,
      password,
      phone,
      role,
      department,
      permissions: defaultPermissions[role] || [],
      isVerified: true // Staff accounts are pre-verified
    });
    
    await user.save();
    
    // Create staff profile
    const staff = new Staff({
      userId: user._id,
      name,
      email,
      phone,
      role: role.charAt(0).toUpperCase() + role.slice(1),
      department,
      licenseNumber,
      hireDate: new Date()
    });
    
    await staff.save();
    
    res.status(201).json({
      success: true,
      message: 'Staff registration successful',
      data: {
        userId: user.userId,
        staffId: staff.staffId,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
    
  } catch (error) {
    console.error('Staff registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});



// Login (checks both roles)
router.post('/login/patient', async (req, res) => {
   try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to failed login attempts'
      });
    }
    
    // Check password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.updateOne({
        $unset: { failedLoginAttempts: 1, lockUntil: 1 }
      });
    }
    
    // Create session
    const deviceInfo = req.get('User-Agent') || 'Unknown Device';
    const sessionId = await sessionManager.addSession(user._id, deviceInfo, req.ip);
    
    // Generate tokens
    const token = generateToken(user, sessionId);
    const refreshToken = generateRefreshToken(user);
    
    // Update last login
    await user.updateOne({ lastLogin: new Date() });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          permissions: user.permissions
        }
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


// Logout
router.post('/logout', protect, auditLog('logout'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (sessionId) {
      await sessionManager.removeSession(req.user._id, sessionId);
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    let profile = null;
    
    if (req.user.role === 'patient') {
      profile = await Patient.findOne({ userId: req.user._id });
    } else {
      profile = await Staff.findOne({ userId: req.user._id });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          userId: req.user.userId,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          department: req.user.department,
          permissions: req.user.permissions,
          isVerified: req.user.isVerified,
          twoFactorEnabled: req.user.twoFactorEnabled
        },
        profile
      }
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Protected routes examples
router.get('/admin/dashboard', protect, authorize('admin'), requirePermission('admin_dashboard'), (req, res) => {
  res.json({
    success: true,
    message: `Welcome to admin dashboard, ${req.user.name}!`,
    data: {
      role: req.user.role,
      permissions: req.user.permissions
    }
  });
});

router.get('/patient/profile', protect, authorize('patient'), (req, res) => {
  res.json({
    success: true,
    message: `Welcome ${req.user.name}!`,
    data: {
      userId: req.user.userId,
      role: req.user.role
    }
  });
});

router.get('/staff/dashboard', protect, authorize('doctor', 'nurse', 'admin', 'lab_technician'), (req, res) => {
  res.json({
    success: true,
    message: `Welcome ${req.user.name}!`,
    data: {
      role: req.user.role,
      department: req.user.department,
      permissions: req.user.permissions
    }
  });
});


module.exports = router;
