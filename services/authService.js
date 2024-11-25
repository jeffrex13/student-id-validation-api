const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

async function register(req, res) {
  const { username, password, userType, name } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create a new user with the createdAt field automatically set
    user = new User({ username, password, userType, name });

    // Validate the user instance
    await user.validate();

    await user.save();

    const payload = {
      userId: user._id,
      userName: user.username,
      userType: user.userType,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.status(201).json({ token });
  } catch (err) {
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.log(err);
    res.status(500).send('Server error');
  }
}

async function login(req, res) {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      userId: user._id,
      userName: user.username,
      userType: user.userType,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.json({ token });
  } catch (err) {
    res.status(500).send('Server error');
  }
}

async function fetchUsers(req, res) {
  const { searchQuery } = req.query; // Get the search query from the request

  try {
    // Construct the query object
    const query = {};

    if (searchQuery) {
      // Use a regular expression for case-insensitive search
      const regex = new RegExp(searchQuery, 'i'); // 'i' for case-insensitive
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    // Fetch users based on the constructed query
    const users = await User.find(query);

    // Return the fetched users
    res.status(200).json(users);
  } catch (err) {
    console.log(err);
    res.status(500).send('Server error');
  }
}

async function updateUser(req, res) {
  const { userId } = req.params; // Get the user ID from the request parameters
  const updateData = req.body; // Get the data to update from the request body

  try {
    // Validate the user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Check if the password is being updated
    if (updateData.password) {
      // Hash the new password before saving
      const salt = await bcrypt.genSalt(10); // Generate a salt
      updateData.password = await bcrypt.hash(updateData.password, salt); // Hash the password
    }

    // Update the user
    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Validate the update against the schema
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Return the updated user data
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).send('Server error');
  }
}

async function deleteUser(req, res) {
  const { userId } = req.params; // Get the user ID from the request parameters

  try {
    // Validate the user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Delete the user
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Return a success message
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.log(err);
    res.status(500).send('Server error');
  }
}

module.exports = { register, login, fetchUsers, updateUser, deleteUser };
