const fs = require('fs');
const mongoose = require('mongoose');
const { parseCSV, parseXLSX } = require('../utils/fileParser');
const path = require('path');

const Student = require('../models/Student');

class CourseNotFoundError extends Error {
  constructor(course) {
    super(`No students found for course ${course}.`);
    this.statusCode = 404;
  }
}

const cleanseTupId = (tupId) => {
  if (!tupId) return tupId;
  // Remove all whitespace and convert to uppercase
  return tupId.toString().trim().replace(/\s+/g, '').toUpperCase();
};

const studentService = {
  // getAllStudents: async () => {
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

  //     return allStudents; // Return the array of students
  //   } catch (error) {
  //     throw new Error(`Error fetching students: ${error.message}`);
  //   }
  // },

  getAllStudents: async () => {
    try {
      // Fetch all students using the Student model
      const allStudents = await Student.find(); // This will return all student documents

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

  // uploadStudents: async (course, filePath) => {
  //   const collectionName = `${course.toLowerCase()}_students`;
  //   const fileExt = path.extname(filePath).toLowerCase();

  //   let results = [];

  //   if (fileExt === '.csv') {
  //     results = await parseCSV(filePath);
  //   } else if (fileExt === '.xlsx') {
  //     results = parseXLSX(filePath);
  //   } else {
  //     throw new Error(
  //       'Unsupported file type. Please upload a CSV or XLSX file.',
  //     );
  //   }

  //   try {
  //     const collection = mongoose.connection.db.collection(collectionName);
  //     await collection.insertMany(results);
  //     return { message: `${results.length} students uploaded successfully.` };
  //   } catch (error) {
  //     throw new Error(`Error uploading students: ${error.message}`);
  //   } finally {
  //     fs.unlinkSync(filePath); // Delete the temporary file
  //   }
  // },

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
      // Clean TUP IDs in the results array
      results = results.map((student) => ({
        ...student,
        tup_id: cleanseTupId(student.tup_id),
      }));

      // Check if the parsed file is empty
      if (results.length === 0) {
        throw new Error('The uploaded file contains no student data.');
      }

      const collection = mongoose.connection.db.collection(collectionName);
      const existingTupIds = await collection.distinct('tup_id');

      // Compare with cleansed existing TUP IDs
      const newStudents = results.filter(
        (student) => !existingTupIds.includes(cleanseTupId(student.tup_id)),
      );

      // if (newStudents.length > 0) {
      //   await collection.insertMany(newStudents);
      // }

      if (newStudents.length === 0) {
        throw new Error(
          `Upload failed: All ${results.length} students in the file already exist`,
        );
      }

      await collection.insertMany(newStudents);

      return {
        message: `${newStudents.length} student(s) uploaded successfully. ${
          results.length - newStudents.length
        } duplicates were skipped.`,
      };
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
      // Cleanse TUP ID if it's being updated
      if (updateData.tup_id) {
        updateData.tup_id = cleanseTupId(updateData.tup_id);
      }

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

      // Check if trying to update TUP ID
      if (
        updateData.tup_id &&
        cleanseTupId(updateData.tup_id) !== cleanseTupId(studentExists.tup_id)
      ) {
        // Check if the new TUP ID already exists in the collection
        const duplicateTupId = await mongoose.connection.db
          .collection(collectionName)
          .findOne({
            tup_id: updateData.tup_id,
            _id: { $ne: objectId }, // Exclude the current student
          });

        if (duplicateTupId) {
          throw new Error(
            `TUP ID ${updateData.tup_id} is already in use by another student.`,
          );
        }
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

  // addStudent: async (course, studentData) => {
  //   const collectionName = `${course.toLowerCase()}_students`;

  //   try {
  //     // Validate if required fields are present
  //     if (!studentData.tup_id) {
  //       throw new Error('Required fields (tup_id) missing');
  //     }

  //     // Check if student with same tup_id already exists in the course
  //     const existingStudent = await mongoose.connection.db
  //       .collection(collectionName)
  //       .findOne({ tup_id: studentData.tup_id });

  //     // console.log(existingStudent);

  //     if (existingStudent) {
  //       throw new Error(
  //         `Student with TUP ID ${studentData.tup_id} already exists in course ${course}`,
  //       );
  //     }

  //     // Add default isValid field if not provided
  //     const studentToAdd = {
  //       ...studentData,
  //       isValid:
  //         studentData.isValid !== undefined ? studentData.isValid : false,
  //       createdAt: new Date(),
  //     };

  //     const result = await mongoose.connection.db
  //       .collection(collectionName)
  //       .insertOne(studentToAdd);

  //     return {
  //       message: 'Student added successfully',
  //       student: { ...studentToAdd, _id: result.insertedId },
  //     };
  //   } catch (error) {
  //     throw new Error(`Error adding student: ${error.message}`);
  //   }
  // },

  addStudent: async (course, studentData) => {
    const collectionName = `${course.toLowerCase()}_students`;

    try {
      // Validate if required fields are present
      if (!studentData.tup_id) {
        throw new Error('Required fields (tup_id) missing');
      }

      // Cleanse the TUP ID
      studentData.tup_id = cleanseTupId(studentData.tup_id);

      // Check if student with same tup_id already exists in the course
      const existingStudent = await mongoose.connection.db
        .collection(collectionName)
        .findOne({ tup_id: studentData.tup_id });

      if (existingStudent) {
        throw new Error(
          `Student with TUP ID ${studentData.tup_id} already exists in course ${course}`,
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

  // delete single student
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

  // delete multiple student
  deleteMultipleStudents: async (studentIds) => {
    try {
      // Validate input
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error('Please provide an array of student IDs to delete.');
      }

      console.log('Received student IDs:', studentIds);

      // Convert all IDs to ObjectId and validate format
      const objectIds = studentIds.map((id) => {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          console.error(`Invalid student ID format: ${id}`); // Log the invalid ID
          throw new Error(`Invalid student ID format: ${id}`);
        }
        return new mongoose.Types.ObjectId(id);
      });

      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();

      let deletedCount = 0;
      const deletedStudents = [];
      const notFoundIds = [...objectIds];

      // Search through all student collections
      for (const { name } of collections) {
        if (name.endsWith('_students')) {
          // Find students by _id
          const studentsToDelete = await mongoose.connection.db
            .collection(name)
            .find({
              _id: { $in: objectIds }, // Using _id for lookup
            })
            .toArray();

          if (studentsToDelete.length > 0) {
            // Delete students by _id
            const result = await mongoose.connection.db
              .collection(name)
              .deleteMany({
                _id: { $in: studentsToDelete.map((s) => s._id) }, // Using _id for deletion
              });

            deletedCount += result.deletedCount;
            deletedStudents.push(...studentsToDelete);

            // Remove found IDs from notFoundIds
            studentsToDelete.forEach((student) => {
              const index = notFoundIds.findIndex((id) =>
                id.equals(student._id),
              );
              if (index !== -1) {
                notFoundIds.splice(index, 1);
              }
            });
          }
        }
      }

      if (deletedCount === 0) {
        throw new Error('No students were found with the provided IDs.');
      }

      return {
        message: `Successfully deleted ${deletedCount} student(s).${
          notFoundIds.length
            ? ` ${notFoundIds.length} student(s) were not found.`
            : ''
        }`,
        deletedStudents,
        ...(notFoundIds.length && {
          notFound: notFoundIds.map((id) => id.toString()),
        }),
      };
    } catch (error) {
      throw new Error(`Error deleting students: ${error.message}`);
    }
  },

  // delete all students in a course
  deleteAllStudentsByCourse: async (course) => {
    const collectionName = `${course.toLowerCase()}_students`;

    try {
      const result = await mongoose.connection.db
        .collection(collectionName)
        .deleteMany({});
      if (result.deletedCount === 0) {
        throw new Error(`No students found in course ${course} to delete.`);
      }
      return {
        message: `${result.deletedCount} student(s) deleted successfully from course ${course}.`,
      };
    } catch (error) {
      throw new Error(
        `Error deleting students from course ${course}: ${error.message}`,
      );
    }
  },
};

module.exports = studentService;
