const express = require('express');
const router = express.Router();
const Appointment = require('../models/appointment'); // ✅ Correct import

router.post('/', async (req, res) => {
  try {
    const newAppointment = new Appointment(req.body);
    const saved = await newAppointment.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try { 
    const appointments = await Appointment.find().populate('patientId', 'name email phone');
    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
