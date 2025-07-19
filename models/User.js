// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  name: { type: String, required: true },
  
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    validate: {
       validator: function(email) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },

  phone: String,
  
  password: { 
      type: String, 
      required: true, 
      minlength: 8,
      select: false // Don't include password in queries by default
    },
  
    // Role-based access control
  role: {
    type: String,
    enum: ['patient', 'doctor', 'nurse', 'admin', 'lab_technician'],
    required: true,
    index: true
  },

  // Profile information
//  name: { type: String, required: true },
  phone: { 
    type: String,
    validate: {
      validator: function(phone) {
        return /^\+?[\d\s\-\(\)]+$/.test(phone);
      },
      message: 'Please enter a valid phone number'
    }
  },
  
  // Security fields
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  
  // Two-factor authentication
  twoFactorSecret: { type: String, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  backupCodes: [{ type: String, select: false }],
  
  // Session management
  activeSessions: [{
    sessionId: String,
    deviceInfo: String,
    ipAddress: String,
    createdAt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now },
    expiresAt: Date
  }],
  
  // Audit trail
  lastPasswordChange: { type: Date, default: Date.now },
  
  // Department/facility assignment for staff
  department: {
    type: String,
    enum: ['Emergency', 'Surgery', 'Pediatrics', 'Cardiology', 'Oncology', 'Laboratory', 'Radiology', 'Administration'],
    required: function() {
      return this.role !== 'patient';
    }
  },
  
  // Fine-grained permissions
  permissions: [{
    type: String,
    enum: [
      'read_patients', 'write_patients', 'delete_patients',
      'read_staff', 'write_staff', 'delete_staff',
      'read_appointments', 'write_appointments', 'cancel_appointments',
      'read_medical_records', 'write_medical_records',
      'read_lab_results', 'write_lab_results',
      'admin_dashboard', 'system_settings', 'audit_logs'
    ]
  }],


   // HIPAA compliance fields
  accessLevel: { 
    type: Number, 
    min: 1, 
    max: 5, 
    default: 1 
  },
  agreementAccepted: { type: Boolean, default: false },
  agreementDate: Date
}, { 
  timestamps: true
});

//}, { timestamps: true });

  
 

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Pre-save middleware to generate userId
userSchema.pre('save', function(next) {
  if (!this.userId) {
    const prefix = this.role === 'patient' ? 'PAT' : 'STF';
    this.userId = `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  next();
});



// Instance methods
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return resetToken;
};

userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1, failedLoginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }
  
  return this.updateOne(updates);
};

module.exports = mongoose.model('User', userSchema);


// Hash password before saving
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// // Password match method
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// module.exports = mongoose.model('User', userSchema);
