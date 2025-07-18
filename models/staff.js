const mongoose = require('mongoose');


const staffSchema = new mongoose.Schema({
  staffId: { type: String, unique: true, required: true },
  name: String,
  role: { type: String, enum: ['Doctor', 'Nurse', 'Admin', 'Lab Technician'], required: true },
  email: String,
  phone: String,
}, { timestamps: true });

module.exports = {
  Staff: mongoose.model('Staff', staffSchema),
};