const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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

const User = mongoose.model('Student', userSchema);

module.exports = User;
