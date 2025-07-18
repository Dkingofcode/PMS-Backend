const express = require('express');
const { Patient, Staff } = require('../models/patient');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'All' ? { category } : {};
    const patients = await Patient.find(filter);
    res.status(200).json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patientId, name, email, phone, category } = req.body;
    const patient = new Patient({ patientId, name, email, phone, category });
    await patient.save();
    res.status(200).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const { staffId, name, role, email, phone } = req.body;
    const staff = new Staff({ staffId, name, role, email, phone });
    await staff.save();
    res.status(200).json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;