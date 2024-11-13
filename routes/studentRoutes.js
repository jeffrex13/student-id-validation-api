const express = require('express');
const router = express.Router();

const studentController = require('../controllers/student');

// Define routes
router.get('/', studentController.getAllStudents);
router.get('/:course', studentController.getAllStudentsByCourse);
router.patch('/:id', studentController.updateStudent);

// router.patch('/:course/:studentId', studentController.updateStudent);
// router.delete('/:course/:studentId', studentController.deleteStudent);
router.post('/upload', studentController.uploadStudents);
router.get('/tup_ids/:tupId', studentController.getTupIdByValue);

// Add new route for adding a single student
router.post('/:course', studentController.addStudent);

// Delete route
router.delete('/:id', studentController.deleteStudent);
// Delete multiple students route
router.delete('/ids/bulk', studentController.deleteMultipleStudents);

module.exports = router;
