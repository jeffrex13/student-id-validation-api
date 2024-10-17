const express = require('express');
const router = express.Router();
// const multer = require('multer');
const studentController = require('../controllers/student');

// Define routes
router.get('/', studentController.getAllStudents);
router.get('/:course', studentController.getAllStudentsByCourse);
router.patch('/:course/:id', studentController.updateStudent);

// router.patch('/:course/:studentId', studentController.updateStudent);
// router.delete('/:course/:studentId', studentController.deleteStudent);
router.post('/upload', studentController.uploadStudents);
router.get('/tup_ids/:tupId', studentController.getTupIdByValue);

module.exports = router;
