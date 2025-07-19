const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },

  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Nigeria' }
  },

  //category: { type: String, enum: ['Walk-in', 'Referred', 'HMO', 'Hospital', 'Corporate'], required: true },
  medicalHistory: [{ test: String, result: String, date: Date }],
  appointments: [{ doctorId: String, date: Date, status: String }],
  
  // Contact information
  email: String,
  phone: String,
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  
  // Insurance and billing
  category: { 
    type: String, 
    enum: ['Walk-in', 'Referred', 'HMO', 'Hospital', 'Corporate'], 
    required: true 
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    validUntil: Date
  },
  
  // Medical information
  bloodType: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] 
  },
  allergies: [String],
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    status: { type: String, enum: ['Active', 'Resolved', 'Chronic'] },
    notes: String
  }],
  
  // Appointments and visits
  appointments: [{
    appointmentId: String,
    doctorId: String,
    doctorName: String,
    date: Date,
    type: String,
    status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled', 'No-show'] },
    notes: String
  }],
  
  // Lab results
  labResults: [{
    testType: String,
    result: String,
    normalRange: String,
    date: Date,
    technician: String,
    status: { type: String, enum: ['Pending', 'Completed', 'Abnormal'] }
  }],
  
  // Privacy and consent
  consentGiven: { type: Boolean, default: false },
  consentDate: Date,
  privacyAgreement: { type: Boolean, default: false },
  
  // Status
  isActive: { type: Boolean, default: true },

}, { timestamps: true });


module.exports = {
  Patient: mongoose.model('Patient', patientSchema),    

}
