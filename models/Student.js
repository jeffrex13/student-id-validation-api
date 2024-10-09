const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  student_image: {
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
});

const User = mongoose.model('Student', studentSchema);

module.exports = User;
