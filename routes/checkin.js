const express = require('express');
const QRCode = require('qrcode');
const Appointment = require('../models/appointment'); // Your appointment model
const Patient = require('../models/patient'); // Your patient model
const router = express.Router();

// routes/appointments.js
router.post('/generate-qr', async (req, res) => {
  try {
    const { patientId } = req.body;

    // Find the most recent appointment
    const appointment = await Appointment.findOne({ patientId }).sort({ createdAt: -1 });
    if (!appointment) return res.status(404).json({ error: 'No appointment found for patient' });

    const qrData = JSON.stringify({
      patientId: patientId,
      appointmentId: appointment._id,
    });

    const qrCode = await QRCode.toDataURL(qrData);
    res.status(200).json({ qrCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/check-in', async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await Appointment.findById(appointmentId).populate('patientId');
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    appointment.status = 'Checked-in';
    await appointment.save();

    res.status(200).json({ message: 'Checked in successfully', appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// router.get('/appointments', async (req, res) => {
//   try {
//     const appointments = await Appointment.find().populate('patientId');
//     res.status(200).json(appointments);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


module.exports = router;