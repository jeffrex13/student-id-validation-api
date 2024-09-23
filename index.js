const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./controllers/auth');

const app = express();
require('dotenv').config();
app.use(express.json()); // For parsing JSON bodies

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
