const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
  status: {
  type: String,
  enum: ['Pending', 'Checked-in'],
  default: 'Pending'
}
}, {
  timestamps: true,
  versionKey: false
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
