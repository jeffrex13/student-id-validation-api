const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  uploadStudents,
  getAllStudents,
} = require('../services/studentService');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// get all students
router.get('/', getAllStudents);

// uploading student data along with images
router.post('/upload', upload.single('file'), uploadStudents);

module.exports = router;
