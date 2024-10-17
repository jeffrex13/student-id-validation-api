const fs = require('fs');
const mongoose = require('mongoose');
const { parseCSV, parseXLSX } = require('../utils/fileParser');
const Student = require('../models/Student');
const xlsx = require('xlsx');
const path = require('path');
const readline = require('readline');

class CourseNotFoundError extends Error {
  constructor(course) {
    super(`No students found for course ${course}.`);
    this.statusCode = 404;
  }
}

const studentService = {
  getAllStudents: async () => {
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

      return allStudents; // Return the array of students
    } catch (error) {
      throw new Error(`Error fetching students: ${error.message}`);
    }
  },

  getAllStudentsByCourse: async (course) => {
    const collectionName = `${course.toLowerCase()}_students`;

    try {
      const users = await mongoose.connection.db
        .collection(collectionName)
        .find()
        .toArray();

      if (!users.length) {
        throw new CourseNotFoundError(course);
      }

      return users;
    } catch (err) {
      if (err instanceof CourseNotFoundError) {
        throw err;
      }
      throw new Error(
        `Error fetching students for course ${course}: ${err.message}`,
      );
    }
  },

  uploadStudents: async (course, filePath) => {
    const collectionName = `${course.toLowerCase()}_students`;
    const fileExt = path.extname(filePath).toLowerCase();

    let results = [];

    if (fileExt === '.csv') {
      results = await parseCSV(filePath);
    } else if (fileExt === '.xlsx') {
      results = parseXLSX(filePath);
    } else {
      throw new Error(
        'Unsupported file type. Please upload a CSV or XLSX file.',
      );
    }

    try {
      const collection = mongoose.connection.db.collection(collectionName);
      await collection.insertMany(results);
      return { message: `${results.length} students uploaded successfully.` };
    } catch (error) {
      throw new Error(`Error uploading students: ${error.message}`);
    } finally {
      fs.unlinkSync(filePath); // Delete the temporary file
    }
  },

  updateStudent: async (course, studentId, updateData) => {
    const collectionName = `${course.toLowerCase()}_students`; // Determine the collection based on the course

    try {
      const result = await mongoose.connection.db
        .collection(collectionName)
        .updateOne(
          { _id: mongoose.Types.ObjectId.createFromHexString(studentId) },
          { $set: updateData },
        );

      if (result.matchedCount === 0) {
        throw new Error(
          'Student not found in the specified course collection.',
        );
      }

      return { message: 'Student updated successfully.' };
    } catch (error) {
      throw new Error(`Error updating student: ${error.message}`);
    }
  },
  // New method to fetch tup_id based on a given value
  getTupIdByValue: async (tupId) => {
    console.log(tupId);
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const foundTupIds = [];

    for (const { name } of collections) {
      if (name.endsWith('_students')) {
        const students = await mongoose.connection
          .collection(name)
          .find({ tup_id: tupId }, { tup_id: 1 })
          .toArray();
        foundTupIds.push(...students.map((student) => student.tup_id));
      }
    }

    // Filter out null or undefined values
    return foundTupIds.filter((id) => id != null);
  },
};

// get all students list
// const getAllStudents = async (req, res) => {
//   try {
//     // Access the database instance through mongoose.connection
//     const collections = await mongoose.connection.db
//       .listCollections()
//       .toArray();

//     const allStudents = [];

//     // Loop through the collections and fetch students from each
//     for (const { name } of collections) {
//       if (name.endsWith('_students')) {
//         const students = await mongoose.connection
//           .collection(name)
//           .find()
//           .toArray();
//         allStudents.push(...students);
//       }
//     }

//     res.json(allStudents); // Send all students as the response
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: 'Error fetching students', error: err.message });
//   }
// };

// Get all students for a specific course
// const getAllStudentsByCourse = async (req, res) => {
//   const { course } = req.params; // Get the course from URL parameters

//   // Create a collection name based on the course (e.g., cafa_students)
//   const collectionName = `${course}_students`;

//   try {
//     const users = await Student.db.collection(collectionName).find().toArray(); // Use the raw MongoDB collection
//     if (!users.length) {
//       return res
//         .status(404)
//         .json({ message: `No students found for course ${course}.` });
//     }
//     res.json(users);
//   } catch (err) {
//     res
//       .status(500)
//       .json({ message: 'Error fetching students', error: err.message });
//   }
// };

// Process the uploaded file and insert students into the specific course collection
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
//     const CourseStudentModel = mongoose.model(
//       `${course}_students`,
//       Student.schema,
//     );

//     // Insert students into the appropriate collection
//     await CourseStudentModel.insertMany(students);
//     res.status(200).send('Students added successfully.');
//   } catch (error) {
//     res.status(500).send('Error: ' + error.message);
//   } finally {
//     // Delete the file after processing
//     if (file) fs.unlinkSync(file.path);
//   }
// };

// module.exports = {
//   getAllStudentsByCourse,
//   getAllStudents,
//   uploadStudents,
//   updateStudent,
//   deleteStudent,
//   getAllStudentsService,
// };

module.exports = studentService;
