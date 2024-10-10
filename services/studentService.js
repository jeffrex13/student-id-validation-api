// const fs = require('fs');
// const Student = require('../models/Student');
// const { parseCSV, parseXLSX } = require('../utils/fileParser');
// const { mongoose } = require('mongoose');

// const getAllStudents = async (req, res) => {
//   try {
//     const users = await Student.find(); // Fetch all users from the database
//     res.json(users);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: 'Error fetching students', error: err.message });
//   }
// };

// // // Process the uploaded file and insert into DB
// // const uploadStudents = async (req, res) => {
// //   const file = req.file;

// //   try {
// //     if (!file) throw new Error('No file uploaded');

// //     let students = [];
// //     if (file.mimetype === 'text/csv') {
// //       students = await parseCSV(file.path);
// //     } else if (
// //       file.mimetype ===
// //       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
// //     ) {
// //       students = parseXLSX(file.path);
// //     } else {
// //       throw new Error('Unsupported file format');
// //     }

// //     // Insert students to MongoDB
// //     await Student.insertMany(students);
// //     res.status(200).send('Students added successfully.');
// //   } catch (error) {
// //     res.status(500).send('Error: ' + error.message);
// //   } finally {
// //     // Delete the file after processing
// //     if (file) fs.unlinkSync(file.path);
// //   }
// // };

// // Process the uploaded file and insert students into the specific course collection
// const uploadStudents = async (req, res) => {
//   const file = req.file;
//   const { course } = req.body; // Extract the course from the request

//   try {
//     if (!file) throw new Error('No file uploaded');
//     if (!course) throw new Error('No course provided');

//     let students = [];
//     if (file.mimetype === 'text/csv') {
//       students = await parseCSV(file.path);
//     } else if (
//       file.mimetype ===
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//     ) {
//       students = parseXLSX(file.path);
//     } else {
//       throw new Error('Unsupported file format');
//     }

//     // Dynamically select the collection based on the course
//     const StudentInfo = mongoose.model(
//       `${course}_students`,
//       Student,
//       `${course}_students`,
//     );

//     // Insert students into the appropriate collection
//     await StudentInfo.insertMany(students);
//     res.status(200).send('Students added successfully.');
//   } catch (error) {
//     res.status(500).send('Error: ' + error.message);
//   } finally {
//     // Delete the file after processing
//     if (file) fs.unlinkSync(file.path);
//   }
// };

// module.exports = {
//   getAllStudents,
//   uploadStudents,
// };

const fs = require('fs');
const mongoose = require('mongoose');
const { parseCSV, parseXLSX } = require('../utils/fileParser');
const Student = require('../models/Student'); // Import the base Student schema

// get all students list
const getAllStudents = async (req, res) => {
  try {
    // Access the database instance through mongoose.connection
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    const allStudents = [];

    // Loop through the collections and fetch students from each
    for (const { name } of collections) {
      if (name.endsWith('_students')) {
        const students = await mongoose.connection
          .collection(name)
          .find()
          .toArray();
        allStudents.push(...students);
      }
    }

    res.json(allStudents); // Send all students as the response
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error fetching students', error: err.message });
  }
};

// Get all students for a specific course
const getAllStudentsByCourse = async (req, res) => {
  const { course } = req.params; // Get the course from URL parameters

  // Create a collection name based on the course (e.g., cafa_students)
  const collectionName = `${course}_students`;

  try {
    const users = await Student.db.collection(collectionName).find().toArray(); // Use the raw MongoDB collection
    if (!users.length) {
      return res
        .status(404)
        .json({ message: `No students found for course ${course}.` });
    }
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error fetching students', error: err.message });
  }
};

// Process the uploaded file and insert students into the specific course collection
const uploadStudents = async (req, res) => {
  const file = req.file;
  const { course } = req.body; // Extract the course from the request

  try {
    if (!file) throw new Error('No file uploaded');
    if (!course) throw new Error('No course provided');

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

    // Dynamically select the collection based on the course
    const CourseStudentModel = mongoose.model(
      `${course}_students`,
      Student.schema,
    );

    // Insert students into the appropriate collection
    await CourseStudentModel.insertMany(students);
    res.status(200).send('Students added successfully.');
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  } finally {
    // Delete the file after processing
    if (file) fs.unlinkSync(file.path);
  }
};

const updateStudent = async (req, res) => {
  const { course, studentId } = req.params; // Get course and studentId from URL parameters
  const collectionName = `${course}_students`; // Define collection name based on course

  try {
    const updatedStudent = await Student.db
      .collection(collectionName)
      .findOneAndUpdate(
        { studentId }, // Find the student by studentId
        { $set: req.body }, // Update the fields provided in the request body
        { returnOriginal: false }, // Return the updated document
      );

    if (!updatedStudent.value) {
      return res.status(404).json({
        message: `Student with ID ${studentId} not found in course ${course}.`,
      });
    }
    res.json(updatedStudent.value); // Send the updated student as the response
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error updating student', error: err.message });
  }
};

const deleteStudent = async (req, res) => {
  const { course, studentId } = req.params; // Get course and studentId from URL parameters
  const collectionName = `${course}_students`; // Define collection name based on course

  try {
    const result = await Student.db
      .collection(collectionName)
      .deleteOne({ studentId }); // Delete the student by studentId

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: `Student with ID ${studentId} not found in course ${course}.`,
      });
    }
    res.status(200).json({
      message: `Student with ID ${studentId} has been deleted successfully.`,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error deleting student', error: err.message });
  }
};

module.exports = {
  getAllStudentsByCourse,
  getAllStudents,
  uploadStudents,
  updateStudent,
  deleteStudent,
};
