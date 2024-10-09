const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  student_image: {
    type: String,
    // required: true,
  },
  name: {
    type: String,
    required: true,
  },
  tup_id: {
    type: String,
    // required: true,
  },
  school_year: {
    type: String,
    // required: true,
  },
});

const User = mongoose.model('Student', studentSchema);

module.exports = User;
