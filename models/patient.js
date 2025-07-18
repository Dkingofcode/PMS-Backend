const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true, required: true },
  name: String,
  email: String,
  phone: String,
  category: { type: String, enum: ['Walk-in', 'Referred', 'HMO', 'Hospital', 'Corporate'], required: true },
  medicalHistory: [{ test: String, result: String, date: Date }],
  appointments: [{ doctorId: String, date: Date, status: String }],
}, { timestamps: true });


module.exports = {
  Patient: mongoose.model('Patient', patientSchema),    

}
