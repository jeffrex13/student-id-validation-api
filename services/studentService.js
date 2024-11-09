const fs = require('fs');
const mongoose = require('mongoose');
const { parseCSV, parseXLSX } = require('../utils/fileParser');
const path = require('path');

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

  getAllStudentsByCourse: async (course, searchQuery = '') => {
    const collectionName = `${course.toLowerCase()}_students`;

    try {
      let query = {};

      // If search query is provided, create a flexible search criteria
      if (searchQuery) {
        query = {
          $or: [
            { tup_id: { $regex: searchQuery, $options: 'i' } },
            { name: { $regex: searchQuery, $options: 'i' } },
          ],
        };
      }

      const users = await mongoose.connection.db
        .collection(collectionName)
        .find(query)
        .toArray();

      if (!users.length) {
        throw new CourseNotFoundError(
          searchQuery
            ? `No students found in ${course} matching '${searchQuery}'`
            : course,
        );
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

  updateStudent: async (studentId, updateData) => {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray(); // Get all collections
    let studentExists = null;
    let collectionName = '';

    try {
      // Validate the student ID
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid student ID format.');
      }

      // Convert the student ID to ObjectId
      const objectId = new mongoose.Types.ObjectId(studentId);

      // Loop through collections to find the student
      for (const { name } of collections) {
        if (name.endsWith('_students')) {
          studentExists = await mongoose.connection.db
            .collection(name)
            .findOne({ _id: objectId });

          if (studentExists) {
            collectionName = name; // Store the collection name if student is found
            break; // Exit loop if student is found
          }
        }
      }

      if (!studentExists) {
        throw new Error('Student not found in any course collection.');
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
        updatedStudent: { ...studentExists, ...updateData }, // Return the updated student data
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

  addStudent: async (course, studentData) => {
    const collectionName = `${course.toLowerCase()}_students`;

    try {
      // Validate if required fields are present
      if (!studentData.tup_id) {
        throw new Error('Required fields (tup_id) missing');
      }

      // Check if student with same tup_id already exists in the course
      const existingStudent = await mongoose.connection.db
        .collection(collectionName)
        .findOne({ tup_id: studentData.tup_id });

      if (existingStudent) {
        throw new Error(
          `Student with TUP ID ${studentData.tup_id} already exists in ${course}`,
        );
      }

      // Add default isValid field if not provided
      const studentToAdd = {
        ...studentData,
        isValid:
          studentData.isValid !== undefined ? studentData.isValid : false,
        createdAt: new Date(),
      };

      const result = await mongoose.connection.db
        .collection(collectionName)
        .insertOne(studentToAdd);

      return {
        message: 'Student added successfully',
        student: { ...studentToAdd, _id: result.insertedId },
      };
    } catch (error) {
      throw new Error(`Error adding student: ${error.message}`);
    }
  },

  deleteStudent: async (studentId) => {
    try {
      // Validate the student ID
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error('Invalid student ID format.');
      }

      const objectId = new mongoose.Types.ObjectId(studentId);
      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      let studentDeleted = false;
      let deletedStudent = null;

      // Search through all student collections
      for (const { name } of collections) {
        if (name.endsWith('_students')) {
          // First find the student to return their info
          deletedStudent = await mongoose.connection.db
            .collection(name)
            .findOne({ _id: objectId });

          if (deletedStudent) {
            // Then delete the student
            const result = await mongoose.connection.db
              .collection(name)
              .deleteOne({ _id: objectId });

            if (result.deletedCount > 0) {
              studentDeleted = true;
              break;
            }
          }
        }
      }

      if (!studentDeleted) {
        throw new Error('Student not found in any course collection.');
      }

      return {
        message: 'Student deleted successfully',
        deletedStudent,
      };
    } catch (error) {
      throw new Error(`Error deleting student: ${error.message}`);
    }
  },
};

module.exports = studentService;
