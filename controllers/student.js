const multer = require('multer');
const path = require('path');

const studentService = require('../services/studentService');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname),
    );
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.csv' || ext === '.xlsx') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and XLSX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

const studentController = {
  getAllStudents: async (req, res) => {
    try {
      const allStudents = await studentService.getAllStudents();
      res.json(allStudents);
    } catch (err) {
      res
        .status(500)
        .json({ message: 'Error fetching students', error: err.message });
    }
  },

  getAllStudentsByCourse: async (req, res) => {
    const course = req.params.course || req.query.course;

    if (!course) {
      return res.status(400).json({ message: 'Course parameter is required.' });
    }

    try {
      const users = await studentService.getAllStudentsByCourse(course);
      res.json(users);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ message: err.message });
    }
  },

  uploadStudents: [
    upload.single('file'),
    async (req, res) => {
      const course = req.params.course || req.body.course || req.query.course;

      if (!course) {
        return res
          .status(400)
          .json({ message: 'Course parameter is required.' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }

      try {
        const result = await studentService.uploadStudents(
          course,
          req.file.path,
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
  ],

  updateStudent: async (req, res) => {
    const studentId = req.params.id; // Student ID from the URL
    const updateData = req.body; // The data to update from the request body

    console.log(`Student ID: ${studentId}, Update Data:`, updateData);

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required.' });
    }

    try {
      const result = await studentService.updateStudent(studentId, updateData);
      res.json(result);
    } catch (error) {
      console.error('Error updating student:', error);
      res.status(500).json({ message: error.message });
    }
  },

  getTupIdByValue: async (req, res) => {
    const { tupId } = req.params; // Get tup_id from request parameters
    try {
      const foundTupIds = await studentService.getTupIdByValue(tupId);

      console.log(foundTupIds);

      if (foundTupIds.length > 0) {
        return res.status(200).json({ message: 'Valid Student ID found.' });
      } else {
        return res.status(404).json({ message: 'No valid student ID found.' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addStudent: async (req, res) => {
    const { course } = req.params;
    const studentData = req.body;

    if (!course) {
      return res.status(400).json({ message: 'Course parameter is required.' });
    }

    try {
      const result = await studentService.addStudent(course, studentData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteStudent: async (req, res) => {
    const studentId = req.params.id;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required.' });
    }

    try {
      const result = await studentService.deleteStudent(studentId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting student:', error);
      res
        .status(error.message.includes('not found') ? 404 : 500)
        .json({ message: error.message });
    }
  },
};

module.exports = studentController;
