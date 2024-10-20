const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./controllers/auth');
const studentRoutes = require('./routes/studentRoutes');
const cors = require('cors');

const app = express();
require('dotenv').config();
app.use(express.json()); // For parsing JSON bodies

// Enable CORS for all requests
app.use(cors());

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// API routes
app.use('/api/auth', authRoutes);

// student routes
app.use('/api/student', studentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
