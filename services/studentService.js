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
      // Validate the student ID
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid student ID format.');
      }

      // Convert the student ID to ObjectId
      const objectId = new mongoose.Types.ObjectId(studentId);

      console.log(objectId);

      // Check if the student exists
      const studentExists = await mongoose.connection.db
        .collection(collectionName)
        .findOne({ _id: objectId });

      console.log(studentExists);

      if (!studentExists) {
        throw new Error(
          'Student not found in the specified course collection.',
        );
      }

      // Perform the update
      const result = await mongoose.connection.db
        .collection(collectionName)
        .updateOne({ _id: objectId }, { $set: updateData });

      // Check if the update was successful
      if (result.modifiedCount === 0) {
        throw new Error('No changes made to the student record.');
      }

      return {
        message: 'Student updated successfully.',
        updatedStudent: result.value,
      };
    } catch (error) {
      throw new Error(`Error updating student: ${error.message}`);
    }
  },

  // fetch tup_id based on a given value
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
          .find({ tup_id: tupId, isValid: true }, { tup_id: 1 }) // Filter for valid tup_id and isValid
          .toArray();

        // Push only valid tup_ids
        foundTupIds.push(...students.map((student) => student.tup_id));
      }
    }

    // Filter out null or undefined values
    return foundTupIds.filter((id) => id != null);
  },
  // getTupIdByValue: async (tupId) => {
  //   console.log(tupId);
  //   const collections = await mongoose.connection.db
  //     .listCollections()
  //     .toArray();
  //   const foundTupIds = [];

  //   for (const { name } of collections) {
  //     if (name.endsWith('_students')) {
  //       const students = await mongoose.connection
  //         .collection(name)
  //         .find({ tup_id: tupId }, { tup_id: 1 })
  //         .toArray();
  //       foundTupIds.push(...students.map((student) => student.tup_id));
  //     }
  //   }

  //   // Filter out null or undefined values
  //   return foundTupIds.filter((id) => id != null);
  // },
};

module.exports = studentService;
