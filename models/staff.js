const mongoose = require('mongoose');


const staffSchema = new mongoose.Schema({
  staffId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "", required: "", unique: ""  },
  

 // Professional information
  name: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Doctor', 'Nurse', 'Admin', 'Lab Technician'], 
    required: true 
  },
  department: { 
    type: String, 
    enum: ['Emergency', 'Surgery', 'Pediatrics', 'Cardiology', 'Oncology', 'Laboratory', 'Radiology', 'Administration'],
    required: true 
  },

  email: String,
  phone: String,

   // Professional credentials
  licenseNumber: String,
  licenseExpiry: Date,
  certifications: [String],
  specializations: [String],
  
  // Employment details
  employeeId: String,
  hireDate: Date,
  employmentStatus: { 
    type: String, 
    enum: ['Active', 'Inactive', 'Suspended', 'Terminated'], 
    default: 'Active' 
  },
  
  // Access permissions
  accessLevel: { 
    type: Number, 
    min: 1, 
    max: 5, 
    default: 1 
  }

}, { timestamps: true });

module.exports = {
  Staff: mongoose.model('Staff', staffSchema),
};