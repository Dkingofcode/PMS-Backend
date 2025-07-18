// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Generate JWT
const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

// Register (can be reused for both roles)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    const user = await User.create({ name, email, password, phone, role });
    res.status(201).json({
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    res.json({
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Example: Staff-only route
router.get('/admin-dashboard', protect, authorize('staff'), (req, res) => {
  res.send('Welcome Staff Member!');
});

// Example: Patient-only route
router.get('/patient-profile', protect, authorize('patient'), (req, res) => {
  res.send(`Welcome Patient ${req.user.name}`);
});


module.exports = router;
