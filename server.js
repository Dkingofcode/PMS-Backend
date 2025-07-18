const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const patientRoutes = require('./routes/patients');
const cors = require('cors');
const appointmentRoutes = require('./routes/appointments');
const checkinRoutes = require('./routes/checkin');
const authRoutes = require('./routes/auth'); // Assuming you have an auth route

dotenv.config();
const app = express();
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173', // Adjust this to your frontend URL

  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true
}));

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

app.use('/api/auth', authRoutes); // Use auth routes  
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/checkin', checkinRoutes);


app.get('/', (req, res) => {
  res.send('Welcome to the Patient Management System API');
});
const server = app.listen(5000, () => console.log('Server running on port 5000'));

server.on('error', (err) => {
  console.error('Server error:', err);
});


