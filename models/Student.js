const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  profile_image: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
  tup_id: {
    type: String,
  },
  school_year: {
    type: String,
  },
  course: {
    type: String,
  },
  isValid: {
    type: Boolean,
    default: false,
  },
  profile_image: {
    type: String,
  },
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
