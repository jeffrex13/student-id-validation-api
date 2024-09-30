const express = require('express');
const router = express.Router();
const Student = require('../models/Student'); // Import the User model

// Endpoint to get all users
router.get('/', async (req, res) => {
  try {
    const users = await Student.find(); // Fetch all users from the database
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error fetching students', error: err.message });
  }
});

module.exports = router;
