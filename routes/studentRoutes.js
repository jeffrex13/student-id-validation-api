const express = require('express');
const router = express.Router();

const studentController = require('../controllers/student');

// Define routes
router.get('/', studentController.getAllStudents);
// router.patch('/:course/:studentId', studentController.updateStudent);
// router.delete('/:course/:studentId', studentController.deleteStudent);
router.get('/validation-stats', studentController.getValidationStats);
router.get('/tup_ids/:tupId', studentController.getTupIdByValue);
router.post('/upload', studentController.uploadStudents);
// Delete multiple students route
router.delete('/ids/bulk', studentController.deleteMultipleStudents);

router.get('/:course', studentController.getAllStudentsByCourse);
// Add new route for adding a single student
router.post('/:course', studentController.addStudent);
router.patch('/:id', studentController.updateStudent);
// Delete route
router.delete('/:id', studentController.deleteStudent);

// Delete all students in a specific course route
router.delete(
  '/delete-all/:course',
  studentController.deleteAllStudentsByCourse,
);

module.exports = router;
