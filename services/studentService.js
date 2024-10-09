const fs = require('fs');
const Student = require('../models/Student');
const { parseCSV, parseXLSX } = require('../utils/fileParser');

const getAllStudents = async (req, res) => {
  try {
    const users = await Student.find(); // Fetch all users from the database
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error fetching students', error: err.message });
  }
};

// Process the uploaded file and insert into DB
const uploadStudents = async (req, res) => {
  const file = req.file;

  try {
    if (!file) throw new Error('No file uploaded');

    let students = [];
    if (file.mimetype === 'text/csv') {
      students = await parseCSV(file.path);
    } else if (
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      students = parseXLSX(file.path);
    } else {
      throw new Error('Unsupported file format');
    }

    // Insert students to MongoDB
    await Student.insertMany(students);
    res.status(200).send('Students added successfully.');
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  } finally {
    // Delete the file after processing
    if (file) fs.unlinkSync(file.path);
  }
};

module.exports = {
  getAllStudents,
  uploadStudents,
};
